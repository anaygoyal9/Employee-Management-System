
const LoadingSpinner = ({ size = "md", text = "Loading data..." }) => {
    const sizeClasses = {
        sm: "h-5 w-5 border-2",
        md: "h-8 w-8 border-3",
        lg: "h-12 w-12 border-4",
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[200px]">
            <div className={`animate-spin rounded-full border-teal-600 border-t-transparent ${sizeClasses[size] || sizeClasses.md}`} />
            {text && <p className="mt-3 text-xs font-medium text-slate-500 animate-pulse">{text}</p>}
        </div>
    );
};

export default LoadingSpinner;
