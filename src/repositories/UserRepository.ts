import User from "../models/User.js";

 class UserRepository {
  async findProfile(userId: string) {
    return User.findById(userId).select("-password");
  }

  async findUserByIdForOwner(
    requestedId: string,
    authenticatedUserId: string
  ) {
    if (requestedId !== authenticatedUserId) {
      return null;
    }

    return User.findById(requestedId).select("-password");
  }
}

export default new UserRepository();