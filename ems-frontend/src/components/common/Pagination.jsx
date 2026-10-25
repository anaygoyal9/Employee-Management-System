import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const Pagination = ({ currentPage, totalPages, totalItems, onPageChange, limit = 10 }) => {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * limit + 1;
    const endItem = Math.min(currentPage * limit, totalItems);

    return (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-100 sm:px-6">
            <div className="text-xs text-slate-500">
                Showing <span className="font-semibold text-slate-700">{startItem}</span> to{' '}
                <span className="font-semibold text-slate-700">{endItem}</span> of{' '}
                <span className="font-semibold text-slate-700">{totalItems}</span> results
            </div>
            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Previous"
                >
                    <FiChevronLeft className="text-base" />
                </button>

                <div className="flex items-center gap-1 px-1 text-xs font-medium text-slate-600">
                    Page <span className="font-bold text-teal-700">{currentPage}</span> of{' '}
                    <span>{totalPages}</span>
                </div>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Next"
                >
                    <FiChevronRight className="text-base" />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
