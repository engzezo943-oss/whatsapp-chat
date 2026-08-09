import axios from "axios";

const API = axios.create({
    baseURL: "https://whatsapp-chat-production-91c0.up.railway.app/api"
});

API.interceptors.request.use((config) => {

    const token = localStorage.getItem("token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export default API;