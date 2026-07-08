import { Router } from "express";
import { createService, deleteService, getAllServices, getServiceWithProvider, getSingleService, searchService, updateService } from "../controllers/serviceController.js";
import {checkUserAuth} from "../middlewares/authMiddleware.js";
import {isProvider} from "../middlewares/roleMiddleware.js";

const router = Router();

//Get all approved services
router.get("/", getAllServices);

//Get public search without login
router.get("/search", searchService);

//Get single service by Id
router.get("/:id",checkUserAuth, getSingleService);

//Get protected search provider details
router.get("/search/:id", checkUserAuth, getServiceWithProvider);

router.post("/create", checkUserAuth, isProvider, createService);
router.put("/update/:id", checkUserAuth, isProvider, updateService);
router.delete("/delete/:id", checkUserAuth, isProvider, deleteService);

export default router;