export const isAdmin = (req, res, next) => {
    if(!req.user || req.user.role !== "admin"){
        return res.status(403).json({message: "Admin access only"});
    }
    next();
};

export const isProvider = (req, res, next) => {
    if(!req.user || req.user.role !== "provider"){
        return res.status(403).json({message: "Service provider access only"});
    }
    next();
}