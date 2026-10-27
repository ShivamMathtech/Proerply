import { demo } from "./demo";
import { api } from "./api";
export const MODE = import.meta.env.VITE_APP_MODE === "api" ? "api" : "demo";
export const services = MODE === "api" ? api : demo;
