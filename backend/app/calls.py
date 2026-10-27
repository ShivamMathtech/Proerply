import base64, hashlib, hmac, json, time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from . import models as m, schemas as s
from .config import settings
from .db import get_db
from .security import current_user, throttle
from .domain import conversation_member

router = APIRouter(prefix="/calls", tags=["WebRTC signaling"])


@router.get("/config")
def config(user=Depends(current_user)):
    try:
        servers = json.loads(settings.ice_servers_json)
    except ValueError:
        raise HTTPException(503, "ICE servers configuration is invalid.")
    if settings.turn_url and settings.turn_secret:
        username = str(int(time.time() + 3600)) + ":" + user.id
        credential = base64.b64encode(
            hmac.new(
                settings.turn_secret.encode(), username.encode(), hashlib.sha1
            ).digest()
        ).decode()
        servers.append(
            {"urls": settings.turn_url, "username": username, "credential": credential}
        )
    return {"iceServers": servers}


@router.get("/{cid}")
def signal(cid: str, db=Depends(get_db), user=Depends(current_user)):
    conversation_member(db, cid, user)
    call = db.get(m.Call, cid)
    if not call or call.expires < time.time():
        return {"offer": None, "answer": None, "ended": True}
    return {"offer": call.offer, "answer": call.answer, "ended": call.ended}


@router.post("/{cid}")
def send_signal(
    cid: str, data: s.Signal, db=Depends(get_db), user=Depends(current_user)
):
    throttle("call:" + user.id, 30)
    conversation_member(db, cid, user)
    call = db.scalar(
        select(m.Call).where(m.Call.conversation_id == cid).with_for_update()
    )
    if data.offer:
        if call and not call.ended and call.expires > time.time():
            raise HTTPException(
                409, "A call is already active. Join it or end it first."
            )
        if not call:
            call = m.Call(conversation_id=cid)
            db.add(call)
        call.caller_id = user.id
        call.offer = data.offer.model_dump()
        call.answer = None
        call.ended = False
        call.expires = time.time() + 3600
    else:
        if not call or call.ended or call.expires < time.time():
            raise HTTPException(409, "No active call invitation.")
        if data.answer:
            if call.caller_id == user.id:
                raise HTTPException(
                    403, "Only the other participant can answer this call."
                )
            if call.answer:
                raise HTTPException(409, "This call has already been answered.")
            call.answer = data.answer.model_dump()
        if data.ended is not None:
            call.ended = True
            call.offer = None
            call.answer = None
    db.commit()
    return {"ok": True}
