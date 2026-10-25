
const Card = ({ title, subtitle, action, children, className = "", noPadding = false }) => {
    return (
        <div className={`bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md ${className}`}>
            {(title || action) && (
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    <div>
                        {title && <h3 className="text-base font-semibold text-slate-800">{title}</h3>}
                        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                    </div>
                    {action && <div>{action}</div>}
                </div>
            )}
            <div className={noPadding ? "" : "p-6"}>
                {children}
            </div>
        </div>
    );
};

export default Card;
