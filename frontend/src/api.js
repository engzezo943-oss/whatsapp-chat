import axios from "axios";

const API = axios.create({
    baseURL:
        "https://whatsapp-chat-production-91c0.up.railway.app/api",

    headers: {
        "Content-Type": "application/json"
    }
});

// =====================================
// Attach JWT Token
// =====================================

API.interceptors.request.use(
    (config) => {

        const token =
            localStorage.getItem("token");

        if (token) {

            config.headers =
                config.headers || {};

            config.headers.Authorization =
                `Bearer ${token}`;
        }

        return config;
    },

    (error) => {
        return Promise.reject(error);
    }
);

// =====================================
// Handle API Errors
// =====================================

API.interceptors.response.use(
    (response) => {
        return response;
    },

    (error) => {

        if (error.response?.status === 401) {

            console.warn(
                "Authentication failed"
            );

            // لا نمسح التوكن تلقائيًا أثناء التطوير
            // حتى نقدر نعرف سبب المشكلة.
        }

        return Promise.reject(error);
    }
);

export default API;