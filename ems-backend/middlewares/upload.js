import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg',
        'image/png',
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        const err = new Error('Only JPEG or PNG images are allowed.');
        err.status = 400;
        cb(err, false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2 MB
    }
});

export default upload;


// changed the multer.diskStorage() to multer.memoryStorage();
// user image -> Multer -> uploads/profile-images
// user image -> Multer -> RAM -> req.file.buffer -> GridFS -> MongoDB