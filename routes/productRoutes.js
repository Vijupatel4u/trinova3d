const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

// PRODUCTS
router.post("/admin/add-product", upload.single("image"), productController.addProduct);
router.get("/", productController.getProducts);

// CATEGORY
router.post("/admin/add-category", productController.addCategory);
router.get("/admin/delete-category/:id", productController.deleteCategory);

module.exports = router;
