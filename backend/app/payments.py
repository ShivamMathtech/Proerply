import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from . import models as m, schemas as s
from .db import get_db
from .config import settings
from .security import current_user, throttle
from .serializers import order_out, rows
from .domain import get_course, enroll_once, enrolled

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("/orders")
def orders(db=Depends(get_db), user=Depends(current_user)):
    return [order_out(db, o) for o in rows(db, m.Order, user_id=user.id)]


@router.post("/checkout")
def checkout(data: s.CourseId, db=Depends(get_db), user=Depends(current_user)):
    throttle("checkout:" + user.id, 15)
    c = get_course(db, data.courseId, user)
    if not c.price_cents:
        raise HTTPException(422, "This is a free course. Use the enrollment endpoint.")
    if enrolled(db, user.id, c.id):
        raise HTTPException(409, "You are already enrolled in this course.")
    if not settings.stripe_secret_key or not settings.stripe_webhook_secret:
        raise HTTPException(
            503,
            "Hosted payments are not configured. Add Stripe server credentials, or use frontend demo mode.",
        )
    order = m.Order(
        user_id=user.id,
        course_id=c.id,
        amount=c.price_cents,
        currency="usd",
        status="pending",
    )
    db.add(order)
    db.commit()
    try:
        result = stripe.checkout.Session.create(
            api_key=settings.stripe_secret_key,
            mode="payment",
            payment_method_types=["card"],
            client_reference_id=order.id,
            metadata={"order_id": order.id},
            line_items=[
                {
                    "quantity": 1,
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": order.amount,
                        "product_data": {"name": c.title},
                    },
                }
            ],
            success_url=f"{settings.frontend_url}/payment/success?order={order.id}&course={c.id}",
            cancel_url=f"{settings.frontend_url}/checkout/{c.id}",
            idempotency_key=order.id,
        )
    except stripe.StripeError:
        order.status = "failed"
        db.commit()
        raise HTTPException(
            502, "Payment provider could not start checkout. Please try again."
        )
    order.provider_id = result.id
    db.commit()
    return {**order_out(db, order), "url": result.url}


def fulfill_event(db, event):
    if db.get(m.PaymentEvent, event["id"]):
        return
    if event["type"] not in (
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
    ):
        return
    session = event["data"]["object"]
    if session.get("payment_status") != "paid":
        return
    oid = session.get("metadata", {}).get("order_id")
    o = (
        db.scalar(select(m.Order).where(m.Order.id == oid).with_for_update())
        if oid
        else None
    )
    if not o:
        raise HTTPException(400, "Order not found.")
    if (
        session.get("amount_total") != o.amount
        or session.get("currency") != o.currency
        or session.get("client_reference_id") != o.id
    ):
        raise HTTPException(400, "Payment does not match the order.")
    if o.provider_id and o.provider_id != session["id"]:
        raise HTTPException(400, "Checkout session does not match the order.")
    o.provider_id = session["id"]
    o.status = "paid"
    enroll_once(db, o.user_id, o.course_id)
    db.add(m.PaymentEvent(id=event["id"], order_id=o.id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if not db.get(m.PaymentEvent, event["id"]):
            raise


@router.post("/webhook")
async def webhook(request: Request, db=Depends(get_db)):
    if not settings.stripe_webhook_secret:
        raise HTTPException(503, "Payment webhook is not configured.")
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            payload,
            request.headers.get("stripe-signature", ""),
            settings.stripe_webhook_secret,
        )
    except (ValueError, stripe.SignatureVerificationError):
        raise HTTPException(400, "Invalid payment webhook signature.")
    fulfill_event(db, event)
    return {"received": True}
