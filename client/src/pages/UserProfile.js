import React, { useContext, useEffect, useRef, useState, useCallback } from "react";
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
  const token = getToken();

  const userId = useContext(AuthContext);

  const availableHobbies = [
    "sports",
    "chess",
    "soccer",
    "basketball",
    "books",
    "politics",
  ];

  const fNameRef = useRef();
  const sNameRef = useRef();
  const bDayRef = useRef();
  const rBadgeRef = useRef();
  const hobbiesRef = useRef();

  const handleHobbiesSelected = (selectedHobbies) => {
    console.log("Selected hobbies:", selectedHobbies);
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

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

    const urlencoded = new URLSearchParams();
    urlencoded.append("firstname", fNameRef.current.value);
    urlencoded.append("surname", sNameRef.current.value);

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: urlencoded,
      redirect: "follow",
    };

    try {
      await fetch(
        `http://localhost:5000/api/users/${userId.userId}`,
        requestOptions
      );
    } catch (error) {
      console.log("error", error);
    }
  };

  useEffect(() => {
    getProfile();
  }, [token, getProfile]);

  return (
    <div>
      {error && <h2>{error}</h2>}

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
              <Form>
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
                  {userProfile.firstName ? (
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      defaultValue={userProfile.firstName}
                    />
                  ) : (
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      ref={fNameRef}
                      required
                    />
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="surname">Surname</label>
                  {userProfile.surName ? (
                    <input
                      type="text"
                      id="surName"
                      name="surName"
                      defaultValue={userProfile.surName}
                    />
                  ) : (
                    <input
                      type="text"
                      id="surname"
                      name="surname"
                      ref={sNameRef}
                      required
                    />
                  )}
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

                  {userProfile.birthDay ? (
                    <input
                      type="text"
                      id="birthDay"
                      name="birthDay"
                      defaultValue={userProfile.birthDay}
                    />
                  ) : (
                    <input
                      type="date"
                      id="birthDay"
                      name="birthDay"
                      ref={bDayRef}
                    />
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="roleBadge">Role Badge</label>

                  {userProfile.roleBadge ? (
                    <select id="roleBadge" name="roleBadge">
                      <option value="Choose a badge..." disabled>
                        Choose a badge...
                      </option>
                      {userProfile.roleBadge === "Parent" ? (
                        <option value="parent" selected>
                          Parent
                        </option>
                      ) : (
                        <option value="parent">Parent</option>
                      )}
                      {userProfile.roleBadge === "Teacher" ? (
                        <option value="teacher" selected>
                          Teacher
                        </option>
                      ) : (
                        <option value="teacher">Teacher</option>
                      )}
                      {userProfile.roleBadge === "Senior" ? (
                        <option value="senior" selected>
                          Senior
                        </option>
                      ) : (
                        <option value="senior">Senior</option>
                      )}
                      {userProfile.roleBadge === "Pupil" ? (
                        <option value="pupil" selected>
                          Pupil
                        </option>
                      ) : (
                        <option value="pupil">Pupil</option>
                      )}
                      {userProfile.roleBadge === "Neighbor" ? (
                        <option value="neigbor" selected>
                          Neighbor
                        </option>
                      ) : (
                        <option value="neighbor">Neigbor</option>
                      )}
                    </select>
                  ) : (
                    <select
                      id="roleBadge"
                      name="roleBadge"
                      ref={rBadgeRef}
                      required
                    >
                      <option value="Choose a badge..." disabled>
                        Choose a badge...
                      </option>
                      <option value="parent">Parent</option>
                      <option value="teacher">Teacher</option>
                      <option value="senior">Senior</option>
                      <option value="pupil">Pupil</option>
                      <option value="neighbor">Neighbor</option>
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="hobbies">Hobbies</label>
                  <div className="input-group hobbies-container">
                    <HobbySelector
                      handleHobbiesSelected={handleHobbiesSelected}
                      availableHobbies={availableHobbies}
                      ref={hobbiesRef}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <Button type="submit" onClick={handleProfileUpdate}>
                    Update Profile
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
