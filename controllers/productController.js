const Product = require("../models/Product");
const Category = require("../models/Category");
const cloudinary = require('cloudinary').v2;

// ================= CATEGORY =================

// ADD CATEGORY
exports.addCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.redirect('/admin/dashboard?error=Category name is required');
    }

    const trimmedName = name.trim();

    const exists = await Category.findOne({ name: trimmedName });
    if (exists) {
      return res.redirect('/admin/dashboard?error=Category already exists');
    }

    await Category.create({ name: trimmedName });

    res.redirect('/admin/dashboard?success=Category added successfully');
  } catch (err) {
    console.log('Add category error:', err);
    res.redirect('/admin/dashboard?error=Failed to add category');
  }
};

// DELETE CATEGORY (BLOCK IF PRODUCTS EXIST)
exports.deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    const productCount = await Product.countDocuments({ category: categoryId });

    if (productCount > 0) {
      return res.redirect(`/admin/dashboard?error=Cannot delete category. ${productCount} product(s) are listed in this category. First delete all products from this category.`);
    }

    await Category.findByIdAndDelete(categoryId);

    res.redirect('/admin/dashboard?success=Category deleted successfully');
  } catch (err) {
    console.log('Delete category error:', err);
    res.redirect('/admin/dashboard?error=Failed to delete category');
  }
};

// ================= PRODUCTS =================

// ADD PRODUCT
exports.addProduct = async (req, res) => {
  try {
    const { name, description, price, category } = req.body;
    const images = [];

    if (!name || !description || !price || !category) {
      return res.redirect('/admin/dashboard?error=All fields are required');
    }

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path);
        images.push(result.secure_url);
      }
    }

    await Product.create({
      name,
      description,
      price: parseFloat(price),
      category,
      images
    });

    res.redirect('/admin/dashboard?success=Product added successfully');
  } catch (err) {
    console.log('Add product error:', err);
    res.redirect('/admin/dashboard?error=Failed to add product');
  }
};

// GET ALL PRODUCTS (Home page)
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().lean();
    const categories = await Category.find();
    const slideshowImages = global.slideshowImages || [];

    res.render("home", { 
      products,
      categories,
      user: req.session.user || null,
      slideshowImages
    });
  } catch (err) {
    console.log('Home page error:', err);
    res.render("home", { 
      products: [],
      categories: [],
      user: null,
      slideshowImages: []
    });
  }
};