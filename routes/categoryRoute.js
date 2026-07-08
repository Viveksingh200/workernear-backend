import { Router } from "express";
import { createCategory, getAllCategories, deleteCategory } from "../controllers/categoryController.js";
import { checkUserAuth } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/roleMiddleware.js";

const router = Router();

// Public categories retrieval
router.get("/", getAllCategories);

// Admin-only category management
router.post("/create", checkUserAuth, isAdmin, createCategory);
router.delete("/:id", checkUserAuth, isAdmin, deleteCategory);

export default router;
