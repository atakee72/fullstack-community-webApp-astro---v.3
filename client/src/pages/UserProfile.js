import React, { useContext, useEffect, useState, useCallback } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { getToken } from "../utils/getToken";
import HobbySelector from "../components/HobbySelector";
import { AuthContext } from "../store/AuthContext";
import "./UserProfile.css";

function UserProfile() {
  const [selectedfile, setSelectedFile] = useState(null);
  const [user, setUser] = useState({});
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const token = getToken();

  const userId = useContext(AuthContext);

  // Form state for controlled components
  const [formData, setFormData] = useState({
    firstName: '',
    surName: '',
    birthDay: '',
    roleBadge: '',
    hobbies: []
  });

  const availableHobbies = [
    "sports",
    "chess",
    "soccer",
    "basketball",
    "books",
    "politics",
  ];

  const handleHobbiesSelected = (selectedHobbies) => {
    setFormData(prev => ({ ...prev, hobbies: selectedHobbies }));
  };

  const getProfile = useCallback(() => {
    if (token) {
      const myHeaders = new Headers();
      myHeaders.append("Authorization", `Bearer ${token}`);

      const requestOptions = {
        method: "GET",
        headers: myHeaders,
      };

      fetch("http://localhost:5000/api/users/userProfile", requestOptions)
        .then((response) => response.json())
        .then((result) => {
          setUserProfile({
            userId: result._id,
            userName: result.userName,
            firstName: result.firstName,
            surName: result.surName,
            birthDay: result.birthDay,
            eMail: result.eMail,
            userPicture: result.userPicture,
            roleBadge: result.roleBadge,
            hobbies: result.hobbies,
            topics: result.topics,
            comments: result.comments,
            likes: result.likes,
          });
          setError(null);
        })
        .catch((error) => console.log("error", error));
    } else {
      setError("You need to log in first!");
      setUser(null);
    }
  }, [token]);

  const handlePictureAttachment = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handlePictureUpload = async (e) => {
    e.preventDefault();

    const formdata = new FormData();
    formdata.append("image", selectedfile);
    formdata.append("userId", userId.userId);

    const requestOptions = {
      method: "POST",
      body: formdata,
      redirect: "follow",
    };

    try {
      const response = await fetch(
        "http://localhost:5000/api/users/imageUpload",
        requestOptions
      );

      const result = await response.json();
      setUser({ ...user, userPicture: result.userPicture });

      if (result) {
        getProfile();
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg("");

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

    const urlencoded = new URLSearchParams();
    urlencoded.append("firstname", formData.firstName);
    urlencoded.append("surname", formData.surName);
    urlencoded.append("birthday", formData.birthDay);
    urlencoded.append("rolebadge", formData.roleBadge);
    urlencoded.append("hobbies", JSON.stringify(formData.hobbies));

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: urlencoded,
      redirect: "follow",
    };

    try {
      const response = await fetch(
        `http://localhost:5000/api/users/${userId.userId}`,
        requestOptions
      );

      if (response.ok) {
        setSuccessMsg("Profile updated successfully!");
        getProfile(); // Refresh profile data
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const error = await response.json();
        setError(error.message || "Failed to update profile");
      }
    } catch (error) {
      console.log("error", error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getProfile();
  }, [token, getProfile]);

  // Initialize form data when userProfile loads
  useEffect(() => {
    if (userProfile) {
      setFormData({
        firstName: userProfile.firstName || '',
        surName: userProfile.surName || '',
        birthDay: userProfile.birthDay || '',
        roleBadge: userProfile.roleBadge || '',
        hobbies: userProfile.hobbies || []
      });
    }
  }, [userProfile]);

  return (
    <div>
      {error && (
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', margin: '10px', borderRadius: '5px' }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ backgroundColor: '#d4edda', color: '#155724', padding: '10px', margin: '10px', borderRadius: '5px' }}>
          {successMsg}
        </div>
      )}

      {userProfile && (
        <main>
          <div>
            <div className="container">
              <h1 className=" main text-center mb-4 pb-1">User Profile</h1>
              <div className="form-group user-profile-form-group">
                <Form onSubmit={handlePictureUpload}>
                  <Form.Label htmlFor="file">
                    Choose a picture to upload
                  </Form.Label>
                  <Form.Control
                    onChange={handlePictureAttachment}
                    type="file"
                    id="file"
                    name="file"
                  />
                  <Form.Text className="text-muted"></Form.Text>
                  <Button type="submit" id="submit">
                    Submit picture
                  </Button>
                </Form>

                <div className="userPicture">
                  {user ? (
                    <img
                      className="user-profile-picture"
                      src={userProfile?.userPicture}
                      alt="user profile"
                    ></img>
                  ) : (
                    <img
                      className="user-profile-picture"
                      src={
                        "https://www.pexels.com/tr-tr/fotograf/anemon-15402787/"
                      }
                      alt="default user"
                    ></img>
                  )}
                </div>
              </div>
              <Form onSubmit={handleProfileUpdate}>
                <div className="form-group">
                  <label htmlFor="username">Username*</label>
                  <input
                    className="username-input"
                    type="text"
                    id="username"
                    name="userName"
                    defaultValue={userProfile.userName}
                    readOnly
                  />
                  <span className="username-readonly-note">
                    <i>*This field is not editable</i>
                  </span>
                </div>
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="surname">Surname</label>
                  <input
                    type="text"
                    id="surname"
                    name="surname"
                    value={formData.surName}
                    onChange={(e) => setFormData(prev => ({ ...prev, surName: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email*</label>
                  <input
                    className="username-input"
                    type="email"
                    id="email"
                    name="email"
                    defaultValue={userProfile.eMail}
                    readOnly
                  />
                  <span className="username-readonly-note">
                    <i>*This field is not editable</i>
                  </span>
                </div>

                <div className="form-group">
                  <label htmlFor="birthDay">Birthday</label>
                  <input
                    type="date"
                    id="birthDay"
                    name="birthDay"
                    value={formData.birthDay}
                    onChange={(e) => setFormData(prev => ({ ...prev, birthDay: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="roleBadge">Role Badge</label>
                  <select
                    id="roleBadge"
                    name="roleBadge"
                    value={formData.roleBadge}
                    onChange={(e) => setFormData(prev => ({ ...prev, roleBadge: e.target.value }))}
                    required
                  >
                    <option value="" disabled>
                      Choose a badge...
                    </option>
                    <option value="parent">Parent</option>
                    <option value="teacher">Teacher</option>
                    <option value="senior">Senior</option>
                    <option value="pupil">Pupil</option>
                    <option value="neighbor">Neighbor</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="hobbies">Hobbies</label>
                  <div className="input-group hobbies-container">
                    <HobbySelector
                      handleHobbiesSelected={handleHobbiesSelected}
                      availableHobbies={availableHobbies}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Updating..." : "Update Profile"}
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        </main>
      )}
      <div className="footer">
        <p>&copy; 2023 My App. All rights reserved.</p>
      </div>
    </div>
  );
}

export default UserProfile;
