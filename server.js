require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();

// --- MongoDB Connection ---
const MONGO_URI = "mongodb+srv://trinova3dadmin:Sharmin123@cluster0.ujdd9nz.mongodb.net/Trinova3Dadmin?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Error:', err.message));

// --- Cloudinary Config ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- Models ---
const Category = require('./models/Category');
const Product = require('./models/Product');
const User = require('./models/User');
const Slideshow = require('./models/Slideshow');

// --- Middleware Setup ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// --- Session Configuration ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'dola_art_secret_8899',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000,
        secure: false 
    }
}));

// GLOBAL MIDDLEWARE - Cart count logic (paste this block in server.js, replace existing middleware)
app.use(async (req, res, next) => {
  if (!req.session.cart) {
    req.session.cart = [];
  }

  let cartCount = req.session.cart.length;

  if (req.session.user) {
    try {
      const Cart = require('./models/Cart');
      const userCart = await Cart.findOne({ user: req.session.user._id });
      if (userCart && userCart.items) {
        cartCount = userCart.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      }
    } catch (err) {
      console.error('Cart sync error:', err);
    }
  }

  res.locals.cartCount = cartCount;
  res.locals.user = req.session.user || null;

  next();
});
// --- Routes Registration ---
app.use('/', require('./routes/authRoutes')); 
app.use('/cart', require('./routes/cartRoutes')); 
app.use('/contact', require('./routes/contact'));
// --- Home Page ---
app.get('/', async (req, res) => {
  try {
    const products = await Product.find().lean();
    const categories = await Category.find().lean();
    
    const slideshowDocs = await Slideshow.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();
    
    const slideshowImages = slideshowDocs.map(doc => ({
      url: doc.imageUrl,
      caption: doc.caption || 'Where Vision Becomes Dimension'
    }));

    res.render('home', { products, categories, slideshowImages });
  } catch (err) {
    console.error('Home page error:', err);
    res.render('home', { products: [], categories: [], slideshowImages: [] });
  }
});
// --- About Us Page ---
app.get('/about', (req, res) => {
  res.render('about');
});

// --- Product Details API (used by modal on home page) ---
app.get('/product/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await Product.findById(productId)
      .populate('category') // Safe populate - category name will come
      .lean();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    console.error('Product details error:', err.message);
    res.status(500).json({ error: 'Server error while loading product' });
  }
});

// --- Admin Dashboard ---
const upload = multer({ dest: 'uploads/' });

app.get('/admin/dashboard', async (req, res) => {
  if (req.session.user?.role !== 'admin') return res.redirect('/login');
  try {
    const products = await Product.find().populate('category').lean();
    const categories = await Category.find().lean();
    
    const slideshowDocs = await Slideshow.find()
      .sort({ order: 1, createdAt: -1 })
      .lean();

    res.render('admin/dashboard', { 
      products, 
      categories, 
      slideshowImages: slideshowDocs,
      error: req.query.error || null, 
      success: req.query.success || null 
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.send("Error loading dashboard");
  }
});
// Add this POST route for adding category (add this block in server.js after admin dashboard GET route)
app.post('/admin/add-category', async (req, res) => {
  if (req.session.user?.role !== 'admin') return res.redirect('/login');

  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.redirect('/admin/dashboard?error=Category name required');
    }

    const trimmedName = name.trim();
    const existing = await Category.findOne({ name: trimmedName });
    if (existing) {
      return res.redirect('/admin/dashboard?error=Category already exists');
    }

    await Category.create({ name: trimmedName });
    res.redirect('/admin/dashboard?success=Category added');
  } catch (err) {
    console.error('Add category error:', err);
    res.redirect('/admin/dashboard?error=' + encodeURIComponent(err.message));
  }
});
// Add new product
app.post('/admin/add-product', upload.array('images', 5), async (req, res) => {
  try {
    const { name, description, price, category } = req.body;
    const images = [];
    if (req.files) {
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
    res.redirect('/admin/dashboard?success=Product added');
  } catch (err) { 
    console.error('Add product error:', err);
    res.redirect('/admin/dashboard?error=' + encodeURIComponent(err.message)); 
  }
});

// Edit Product - GET (show form)
app.get('/admin/edit-product/:id', async (req, res) => {
  if (req.session.user?.role !== 'admin') return res.redirect('/login');

  try {
    const productId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.redirect('/admin/dashboard?error=Invalid product ID');
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.redirect('/admin/dashboard?error=Product not found');
    }

    const categories = await Category.find().lean();

    res.render('admin/edit-product', { 
      product, 
      categories,
      error: req.query.error,
      success: req.query.success 
    });
  } catch (err) {
    console.error('Edit product GET error:', err);
    res.redirect('/admin/dashboard?error=' + encodeURIComponent(err.message));
  }
});

// Edit Product - POST (update)
app.post('/admin/edit-product/:id', upload.array('images', 5), async (req, res) => {
  if (req.session.user?.role !== 'admin') return res.redirect('/login');

  try {
    const productId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.redirect('/admin/dashboard?error=Invalid product ID');
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.redirect('/admin/dashboard?error=Product not found');
    }

    const { name, description, price, category } = req.body;

    product.name = name || product.name;
    product.description = description || product.description;
    product.price = parseFloat(price) || product.price;
    product.category = category || product.category;

    if (req.files && req.files.length > 0) {
      const newImages = [];
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path);
        newImages.push(result.secure_url);
      }
      product.images = [...product.images, ...newImages];
    }

    await product.save();

    res.redirect('/admin/dashboard?success=Product updated successfully');
  } catch (err) {
    console.error('Edit product POST error:', err);
    res.redirect('/admin/dashboard?error=' + encodeURIComponent(err.message));
  }
});

// Delete single product image
app.post('/admin/delete-product-image', async (req, res) => {
  if (req.session.user?.role !== 'admin') return res.redirect('/login');

  try {
    const { productId, imageUrl } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.redirect('/admin/dashboard?error=Invalid product ID');
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.redirect('/admin/dashboard?error=Product not found');
    }

    product.images = product.images.filter(img => img !== imageUrl);

    const publicId = imageUrl.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(publicId).catch(err => console.log('Cloudinary delete error:', err));

    await product.save();

    res.redirect(`/admin/edit-product/${productId}?success=Image deleted`);
  } catch (err) {
    console.error('Delete image error:', err);
    res.redirect(`/admin/edit-product/${productId}?error=${encodeURIComponent(err.message)}`);
  }
});

// Add slideshow image
app.post('/admin/add-slideshow', upload.single('slideshowImage'), async (req, res) => {
  try {
    if (!req.file) throw new Error('No image selected');
    
    const result = await cloudinary.uploader.upload(req.file.path, { folder: 'dola-slideshow' });
    await Slideshow.create({ imageUrl: result.secure_url, caption: req.body.caption || 'Where Vision Becomes Dimension' });

    res.redirect('/admin/dashboard?success=Slideshow image added');
  } catch (err) {
    console.error('Slideshow upload error:', err);
    res.redirect('/admin/dashboard?error=' + encodeURIComponent(err.message));
  }
});

// Delete slideshow image
app.post('/admin/delete-slideshow/:id', async (req, res) => {
  if (req.session.user?.role !== 'admin') return res.redirect('/login');

  try {
    const slideshowId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(slideshowId)) {
      return res.redirect('/admin/dashboard?error=Invalid image ID');
    }

    const deletedImage = await Slideshow.findByIdAndDelete(slideshowId);
    if (!deletedImage) {
      return res.redirect('/admin/dashboard?error=Image not found');
    }

    if (deletedImage.imageUrl) {
      const publicId = deletedImage.imageUrl.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`dola-slideshow/${publicId}`);
    }

    res.redirect('/admin/dashboard?success=Slideshow image deleted');
  } catch (err) {
    console.error('Delete slideshow error:', err);
    res.redirect('/admin/dashboard?error=' + encodeURIComponent(err.message));
  }
});

// Delete Category
app.post('/admin/delete-category/:id', async (req, res) => {
  if (req.session.user?.role !== 'admin') return res.redirect('/login');

  try {
    const categoryId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.redirect('/admin/dashboard?error=Invalid category ID');
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.redirect('/admin/dashboard?error=Category not found');
    }

    const productsInCategory = await Product.countDocuments({ category: categoryId });
    if (productsInCategory > 0) {
      return res.redirect('/admin/dashboard?error=Cannot delete category with products.');
    }

    await Category.findByIdAndDelete(categoryId);
    res.redirect('/admin/dashboard?success=Category deleted');
  } catch (err) {
    console.error('Delete category error:', err);
    res.redirect('/admin/dashboard?error=' + encodeURIComponent(err.message));
  }
});

// Edit Category
app.post('/admin/edit-category/:id', async (req, res) => {
  if (req.session.user?.role !== 'admin') return res.redirect('/login');

  try {
    const categoryId = req.params.id;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.redirect('/admin/dashboard?error=Category name is required');
    }

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.redirect('/admin/dashboard?error=Invalid category ID');
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.redirect('/admin/dashboard?error=Category not found');
    }

    const newName = name.trim();
    const existing = await Category.findOne({ name: newName });
    if (existing && existing._id.toString() !== categoryId) {
      return res.redirect('/admin/dashboard?error=Category name already exists');
    }

    category.name = newName;
    await category.save();

    res.redirect('/admin/dashboard?success=Category updated');
  } catch (err) {
    console.error('Edit category error:', err);
    res.redirect('/admin/dashboard?error=' + encodeURIComponent(err.message));
  }
});

// Delete Product
app.post('/admin/delete-product/:id', async (req, res) => {
  if (req.session.user?.role !== 'admin') return res.redirect('/login');

  try {
    const productId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.redirect('/admin/dashboard?error=Invalid product ID');
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.redirect('/admin/dashboard?error=Product not found');
    }

    if (product.images && product.images.length > 0) {
      for (const imgUrl of product.images) {
        const publicId = imgUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId).catch(err => console.log('Cloudinary delete error:', err));
      }
    }

    await Product.findByIdAndDelete(productId);

    res.redirect('/admin/dashboard?success=Product deleted successfully');
  } catch (err) {
    console.error('Delete product error:', err);
    res.redirect('/admin/dashboard?error=' + encodeURIComponent(err.message));
  }
});


// --- Server Start ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});