import { useEffect } from 'react';
import { IoClose } from 'react-icons/io5';

const Modal = ({ isOpen, onClose, title, children, footer, maxWidth = "max-w-lg" }) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
                onClick={onClose}
            />

            {/* Modal Dialog */}
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                <div className={`relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all w-full ${maxWidth} my-8`}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            <IoClose className="text-xl" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">
                        {children}
                    </div>

                    {/* Footer */}
                    {footer && (
                        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50/80 border-t border-slate-100">
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Modal;
