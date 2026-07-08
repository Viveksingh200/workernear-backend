import { User } from "../models/userModel.js";
import { Worker } from "../models/workerModel.js";
import { Review } from "../models/reviewModel.js";

// GET pending workers awaiting approval
export const getPendingWorkers = async (req, res) => {
  try {
    const workers = await Worker.find({ approved: false });
    return res.status(200).json({
      success: true,
      count: workers.length,
      workers
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Server Error" });
  }
};

// PATCH approve worker profile
export const approveWorker = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    if (worker.approved === true) {
      return res.status(400).json({ message: "Worker profile is already approved" });
    }

    worker.approved = true;
    await worker.save();

    return res.status(200).json({
      success: true,
      message: "Worker profile approved successfully",
      worker
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// GET approved workers
export const getApprovedWorkers = async (req, res) => {
  try {
    const workers = await Worker.find({ approved: true });
    return res.status(200).json({
      success: true,
      count: workers.length,
      workers
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// GET all workers (admin dashboard view)
export const getAllWorkersAdmin = async (req, res) => {
  try {
    const workers = await Worker.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: workers.length,
      workers
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Server Error" });
  }
};

// GET all users (excluding admins, for dashboard directory view)
export const getAllUsersAdmin = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } }).select("-password").sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Server Error" });
  }
};

// PATCH toggle block/unblock status of a user (or worker)
export const toggleBlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(400).json({ message: "Admins cannot be blocked" });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User has been ${user.isBlocked ? "blocked" : "unblocked"} successfully`,
      user
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Server Error" });
  }
};

// DELETE fake worker profile completely
export const deleteFakeWorker = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    // Delete associated reviews
    await Review.deleteMany({ workerId: worker._id });

    // Delete associated worker document
    await Worker.deleteOne({ _id: worker._id });

    // Also delete the user login account for this worker if desired
    await User.deleteOne({ _id: worker.userId });

    return res.status(200).json({
      success: true,
      message: "Fake worker profile and login account deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Server Error" });
  }
};