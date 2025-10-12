import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import Logout from "./Logout";
import { AuthContext } from "../store/AuthContext";
import { getToken } from "../utils/getToken";
import "./Navbar.css";

function Navbar() {
  const { userId, loggedUser } = useContext(AuthContext);
  const token = getToken();

  return (
    <div className="navContainer">
      <nav>
        <ul>
          <div>
            <li className="ornek">
              <NavLink to="/">
                <span>Home</span>
              </NavLink>
            </li>
            <li className="loginLink">
              <NavLink to="login">
                <span>Login</span>
              </NavLink>
            </li>
            <li className="registerLink">
              <NavLink to="register">
                <span>Register</span>
              </NavLink>
            </li>
            {loggedUser && (
              <li className="profileLink">
                <NavLink to="userProfile">
                  <span>User Profile</span>
                </NavLink>
              </li>
            )}
          </div>
          {userId && (
            <li className="logoutLink">
              <Logout />
            </li>
          )}
        </ul>
      </nav>

      <div className="user-info">
        {token && (
          <>
            <NavLink to="userProfile">
              <img
                className="logged-user-pic"
                src={loggedUser?.picture}
                alt={loggedUser?.userName}
              />
            </NavLink>

            <h2 className="user-name"> {loggedUser?.userName} </h2>
          </>
        )}
      </div>
    </div>
  );
}

export default Navbar;
