const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const port = 4000;

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000', // Adjust to your frontend port
  credentials: true,
}));

// Database Connection with MongoDB
mongoose.connect("mongodb+srv://erinhdsilva:Ems%401234@cluster0.whsiygg.mongodb.net/e-commerce?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("Connected to MongoDB");
})
.catch((error) => {
  console.error("Error connecting to MongoDB:", error);
});

// Image Storage Engine
const storage = multer.diskStorage({
  destination: './upload/images',
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage: storage });

app.use('/images', express.static('upload/images'));

// Schema for Creating Products
const Product = mongoose.model("Product", {
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  new_price: {
    type: Number,
    required: true,
  },
  old_price: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true,
  },
});

// Adding Product with Image
app.post('/addproduct', async (req, res) => {
  try {
    let products = await Product.find({});
    let id = products.length > 0 ? products[products.length - 1].id + 1 : 1;

    const { name, category, new_price, old_price, image } = req.body;

    const product = new Product({
      id,
      name,
      image,
      category,
      new_price,
      old_price,
    });

    await product.save();
    res.json({
      success: true,
      name: product.name,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add product",
      error: error.message,
    });
  }
});

// Creating API for deleting Product
app.post('/removeproduct', async (req, res) => {
  try {
    const { id } = req.body;
    await Product.findOneAndDelete({ id });
    console.log("Product removed:", id);
    res.json({
      success: true,
      id,
    });
  } catch (error) {
    console.error("Error removing product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove product",
      error: error.message,
    });
  }
});

// Creating API for getting all products
app.get('/allproducts', async (req, res) => {
  try {
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
});

// Schema Creating for User Model
const Users = mongoose.model('Users', {
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  cartData: {
    type: mongoose.Schema.Types.Mixed, // Use Mixed type for arbitrary objects
  },
  date: {
    type: Date,
    default: Date.now,
  }
});

// Creating Endpoint for registering the user
app.post('/signup', async (req, res) => {
  try {
    let check = await Users.findOne({ email: req.body.email });
    if (check) {
      return res.status(400).json({ success: false, errors: "Existing user found with the same email address" });
    }
    let cart = {};
    for (let i = 0; i < 300; i++) {
      cart[i] = 0;
    }
    const user = new Users({
      name: req.body.username,
      email: req.body.email,
      password: req.body.password,
      cartData: cart,
    });
    await user.save();

    const data = {
      user: {
        id: user.id
      }
    };
    const token = jwt.sign(data, 'secret_ecom');
    res.json({ success: true, token });
  } catch (error) {
    console.error("Error signing up user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sign up user",
      error: error.message,
    });
  }
});

// Creating endpoint for user login
app.post('/login', async (req, res) => {
  try {
    let user = await Users.findOne({ email: req.body.email });
    if (!user) {
      return res.status(401).json({ success: false, errors: "Wrong Email Id" });
    }

    const passCompare = req.body.password === user.password;
    if (!passCompare) {
      return res.status(401).json({ success: false, errors: "Wrong Password" });
    }

    const data = {
      user: {
        id: user.id
      }
    };
    const token = jwt.sign(data, 'secret_ecom');
    res.json({ success: true, token });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to log in user",
      error: error.message,
    });
  }
});

// Middleware to fetch user
const fetchUser = async (req, res, next) => {
  const token = req.header('auth-token');
  if (!token) {
    console.log("No auth-token found in header");
    return res.status(401).send({ errors: "Please authenticate using a valid token" });
  }
  try {
    const data = jwt.verify(token, 'secret_ecom');
    console.log("Token verification successful:", data);
    req.user = data.user;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).send({ errors: "Please authenticate with a valid token" });
  }
};

// Endpoint to get user's cart data
app.post('/getcart', fetchUser, async (req, res) => {
  try {
    console.log("GetCart endpoint called");
    
    let userData = await Users.findById(req.user.id);
    
    if (!userData) {
      console.log("User not found");
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log("User data retrieved successfully");
    res.json(userData.cartData);
  } catch (error) {
    console.error("Error fetching cart data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cart data",
      error: error.message,
    });
  }
});

// Creating endpoint for adding products to cart data
app.post('/addtocart', fetchUser, async (req, res) => {
  try {
    const { itemId } = req.body;
    console.log("added", req.body, itemId);  // Ensure itemId is correctly logged
    console.log("Request Body:", req.body);
    let userData = await Users.findOne({ _id: req.user.id });
   
    userData.cartData[itemId] = (userData.cartData[itemId] || 0) + 1;
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    console.log("User Data after update:", userData.cartData);  // Log the final updated cart data
    res.json("Added");
  } catch (error) {
    console.error("Error adding item to cart:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add item to cart",
      error: error.message,
    });
  }
});


//creating endpoint to remove product from cartdata
app.post('/removefromcart', fetchUser, async (req, res) => {
  try {
    const { itemId } = req.body;
    console.log("removed", req.body, itemId);  // Ensure itemId is correctly logged
    console.log("Request Body:", req.body);
    let userData = await Users.findOne({ _id: req.user.id });

    userData.cartData[itemId] = Math.max((userData.cartData[itemId] || 0) - 1, 0);
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    console.log("User Data after update:", userData.cartData);  // Log the final updated cart data
    res.json("Removed");
  } catch (error) {
    console.error("Error removing item from cart:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove item from cart",
      error: error.message,
    });
  }
});


app.listen(port, () => {
  console.log("Server Running on Port " + port);
});
