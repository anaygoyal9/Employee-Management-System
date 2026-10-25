
const StatCard = ({ title, value, icon: Icon, change, subtext, color = "indigo" }) => {
    const colorSchemes = {
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        rose: "bg-rose-50 text-rose-600 border-rose-100",
        teal: "bg-teal-50 text-teal-600 border-teal-100",
        sky: "bg-sky-50 text-sky-600 border-sky-100",
        purple: "bg-purple-50 text-purple-600 border-purple-100",
    };

    const scheme = colorSchemes[color] || colorSchemes.indigo;

    return (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
                    <h4 className="text-2xl font-bold text-slate-800 mt-1.5">{value}</h4>
                    {(change || subtext) && (
                        <div className="flex items-center gap-1.5 mt-2">
                            {change && (
                                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    {change}
                                </span>
                            )}
                            {subtext && <span className="text-xs text-slate-500">{subtext}</span>}
                        </div>
                    )}
                </div>
                {Icon && (
                    <div className={`p-3.5 rounded-xl border ${scheme}`}>
                        <Icon className="text-xl" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatCard;
