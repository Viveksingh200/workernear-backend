import Service from "../models/serviceModel.js";

export const createService = async (req, res) => {
    try {
        const { title, category, description, price, location } = req.body;

  if (!title || !category || !description || !price || !location) {
    return res.status(400).json({ message: "All fields are required!" });
  }

  const service = await Service.create({
    title,
    category,
    description,
    price,
    location,
    providerId: req.user.id,
  });

  return res
    .status(201)
    .json({
      success: true,
      message: "Service created and pending approval",
      service,
    });
    } catch (error) {
        return res.status(500).json({message: "Internal Server Error"});
    }
};

export const getAllServices = async (req, res) => {
  try {
    const services = await Service.find({ isApproved: true}).populate("providerId", "name phone");
    res.status(200).json({
      success: true,
      count: services.length,
      services
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({message: "Internal Server Error"})
  }
}

//Get single service by Id
export const getSingleService = async (req, res) => {
  try {
    const service = await Service.findById({
      _id: req.params.id,
      isApproved: true
    }).populate("providerId", "name phone");

    if(!service){
      return res.status(404).json({message: "Service not found"});
    }

    res.status(200).json({
      success: true,
      service
    })
  } catch (error) {
    console.log(error);
    res.status(500).json({message: "Internal Server Error"});
  }
};

//Search Approved Service
export const searchService = async (req, res) => {
  try {
    const {category, location} = req.query;

    const filter = {isApproved: true};
    if(category) filter.category = new RegExp(category, "i");
    if(location) filter.location = new RegExp(location, "i");

    const service = await Service.find(filter);
    res.status(200).json({
      success: true,
      service
    })
  } catch (error) {
    console.log(error);
    res.status(500).json({message: "Internal Server Error"});
  }
}

//Get search single service with provider details
export const getServiceWithProvider = async (req, res) => {
  try {
    const service = await Service.findOne({
      _id: req.params.id,
      isApproved: true
    }).populate("providerId", "name phone");

    if(!service){
      return res.status(404).json({message: "Service not found"});
    }

    res.status(200).json({
      success: true,
      service
    })
  } catch (error) {
    console.log(error);
    res.status(500).json({message: "Internal Server Error"});
  }
};



export const updateService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if(!service){
      return res.status(404).json({message: "Service not found"});
    }

    if(service.providerId.toString() !== req.user.id){
      return res.status(403).json({message: "Not authorized"});
    }

    Object.assign(service, req.body);
    service.isApproved = false;
    await service.save();

    res.status(200).json({
      success: true,
      message: "Service updated successfully",
      service
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({message: "Server error"});
  }
};

export const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if(!service){
      return res.status(404).json({message: "Service not found"});
    }

    if(service.providerId.toString() !== req.user.id){
      return res.status(403).json({message: "Not authorized"});
    }

    await Service.deleteOne();

    res.status(200).json({
      success: true,
      message: "Service deleted successfully"
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({message: "Server Error"});
  }
};


