import { useState } from "react";

import {
    X,
    Camera
} from "lucide-react";

import API from "../api";


const SERVER_URL =
    "https://whatsapp-chat-production-91c0.up.railway.app";


export default function ProfileModal({
    user,
    onClose,
    onUpdate
}) {

    const [file, setFile] =
        useState(null);

    const [preview, setPreview] =
        useState(null);

    const [loading, setLoading] =
        useState(false);


    // =================================
    // Select Image
    // =================================

    const handleFile = (e) => {

        const selected =
            e.target.files?.[0];

        if (!selected) {
            return;
        }


        if (
            !selected.type.startsWith("image/")
        ) {

            alert(
                "Please select an image"
            );

            return;

        }


        if (
            selected.size >
            5 * 1024 * 1024
        ) {

            alert(
                "Image must be less than 5MB"
            );

            return;

        }


        setFile(selected);

        setPreview(
            URL.createObjectURL(selected)
        );

    };


    // =================================
    // Upload
    // =================================

    const uploadAvatar = async () => {

        if (!file) {

            alert(
                "Please select an image first"
            );

            return;

        }


        const formData =
            new FormData();


        formData.append(
            "avatar",
            file
        );


        setLoading(true);


        try {

            const response =
                await API.post(
                    "/users/profile/avatar",
                    formData
                );


            console.log(
                "Avatar response:",
                response.data
            );


            const avatar =
                response.data.avatar;


            const updatedUser = {

                ...user,

                avatar

            };


            // Update local storage

            localStorage.setItem(
                "user",
                JSON.stringify(
                    updatedUser
                )
            );


            // Update App state

            onUpdate(
                updatedUser
            );


            onClose();


        } catch (error) {

            console.error(
                "Avatar upload error:",
                error
            );


            console.error(
                "Server response:",
                error.response?.data
            );


            alert(
                error.response?.data?.message ||
                "Failed to upload avatar"
            );


        } finally {

            setLoading(false);

        }

    };


    // =================================
    // Avatar URL
    // =================================

    const avatarUrl =
        user?.avatar
            ? `${SERVER_URL}${user.avatar}`
            : null;


    return (

        <div className="modal-overlay">

            <div className="profile-modal">


                <button
                    className="close-modal"
                    onClick={onClose}
                >

                    <X size={22} />

                </button>


                <h2>
                    My Profile
                </h2>


                {/* Avatar */}

                <div className="profile-preview">


                    {preview ? (

                        <img
                            src={preview}
                            alt="Preview"
                        />

                    ) : avatarUrl ? (

                        <img
                            src={avatarUrl}
                            alt={user?.name}
                            onError={(e) => {

                                console.error(
                                    "Avatar failed to load:",
                                    avatarUrl
                                );

                                e.currentTarget.style.display =
                                    "none";

                            }}
                        />

                    ) : (

                        <span>

                            {user?.name
                                ?.charAt(0)
                                .toUpperCase()
                            }

                        </span>

                    )}


                    {/* Camera */}

                    <label
                        className="camera-button"
                        title="Change profile picture"
                    >

                        <Camera size={18} />

                        <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={handleFile}
                        />

                    </label>

                </div>


                <h3>
                    {user?.name}
                </h3>


                <p>
                    {user?.email}
                </p>


                {file && (

                    <button
                        className="save-profile"
                        onClick={uploadAvatar}
                        disabled={loading}
                    >

                        {loading
                            ? "Uploading..."
                            : "Save Photo"
                        }

                    </button>

                )}

            </div>

        </div>

    );

}