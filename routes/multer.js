const multer = require("multer");  //Multer is a Node.js middleware for handling multipart/form-data,
                                  // which is primarily used for uploading files.Multer makes the process of uploading files in Node.js easier.
const { v4: uuid } = require("uuid");

const path = require("path");

const storage = multer.diskStorage({     //documentatio
  destination: function (req, file, cb) {
    cb(null, "./public/images/uploads");  //is jagah pe store
  },
  filename: function (req, file, cb) {
    const fn = uuid() + path.extname(file.originalname);
    cb(null, fn);
  },
});

const upload = multer({ storage: storage });
module.exports = upload;