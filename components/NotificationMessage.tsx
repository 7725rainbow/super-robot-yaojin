import React from 'react';

interface NotificationMessageProps {
    message: string;
}

const NotificationMessage: React.FC<NotificationMessageProps> = ({ message }) => {
    return (
        <div className="my-4 text-center animate-fade-in-up">
            <div className="inline-block bg-violet-100 text-violet-800 text-sm font-semibold px-4 py-2 rounded-full border border-violet-200">
                <span role="img" aria-label="sparkles" className="mr-2">✨</span>
                {message}
            </div>
        </div>
    );
};

export default NotificationMessage;