import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../store/AuthContext.js";
import ForumSection from "../components/ForumSection";
import "./Home.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function Home(selectedTags) {
  const [collectionType, setCollectionType] = useState("topics");
  const [items, setItems] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchInputValue, setSearchInputValue] = useState("");
  const searchInputRef = useRef(null);
  const { loggedUser, userId } = useContext(AuthContext);
  const [myTags, setMyTags] = useState(selectedTags);
  const [serverMsg, setServerMsg] = useState("");

  const postTitleRef = useRef();
  const postBodyRef = useRef();
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");

  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => {
    setShow(true);
    resetPostForm();
  };

  const availableTags = [
    "sports",
    "health",
    "children",
    "school",
    "social",
    "politics",
  ];

  const handleTagsSelected = (selectedTags) => {
    setMyTags(selectedTags);
  };

  const resetPostForm = () => {
    setPostTitle(null);
    setPostBody(null);
  };

  const fetchData = async () => {
    const requestOptions = {
      method: "GET",
      redirect: "follow",
    };

    try {
      const response = await fetch(
        `${API_URL}/${collectionType}/all`,
        requestOptions
      );
      const result = await response.json();

      if (collectionType === "topics") {
        setItems(result.requestedTopics);
        setFilteredData(result.requestedTopics);
      } else if (collectionType === "announcements") {
        setItems(result.requestedAnnouncements);
        setFilteredData(result.requestedAnnouncements);
      } else if (collectionType === "recommendations") {
        setItems(result.requestedRecommendations);
        setFilteredData(result.requestedRecommendations);
      }
    } catch (error) {
      console.error("error", error);
    }
  };

  const handle_InSearch_Input = (e) => {
    // e.preventDefault();
  };

  const handle_InSearch_Filter = () => {
    setSearchInputValue(searchInputRef.current.value.toLowerCase());
    const filtered = items.filter(
      (item) =>
        item.title.toLowerCase().includes(searchInputValue) ||
        item.body.toLowerCase().includes(searchInputValue)
    );
    setFilteredData(filtered);
  };

  const postInForum = async (e) => {
    e.preventDefault();
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

    const urlencoded = new URLSearchParams();
    urlencoded.append("title", postTitle);
    urlencoded.append("body", postBody);
    urlencoded.append("author", userId);
    urlencoded.append("date", Date.now());
    urlencoded.append("tags", myTags);
    urlencoded.append("likes", 0);
    urlencoded.append("views", 0);

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: urlencoded,
      redirect: "follow",
    };

    try {
      const response = await fetch(`${API_URL}/topics/post`, requestOptions);
      const newPost = await response.json();

      if (newPost) {
        handleClose();
        fetchData();
      }
    } catch (error) {
      console.error("Error sending the new post", error);
    }
  };

  const deleteForumPost = async (e, post) => {
    e.preventDefault();
    const requestOptions = {
      method: "DELETE",
      redirect: "follow",
    };

    try {
      const response = await fetch(
        `${API_URL}/topics/${post._id}`,
        requestOptions
      );
      const deletedPost = await response.json();

      if (deletedPost) {
        fetchData();
      }
    } catch (error) {
      console.error("🚀 ~ deleteForumPost ~ error:", error);
      alert("🚀 ~ Post could not be deleted:", error.msg);
    }
  };

  const postAComment = async (e, commentText, post) => {
    e.preventDefault();
    try {
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

      const urlencoded = new URLSearchParams();
      urlencoded.append("body", commentText);
      urlencoded.append("author", userId);
      urlencoded.append("date", Date.now());
      urlencoded.append("upvotes", "5");
      urlencoded.append("relevantPostId", post._id);

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: urlencoded,
        redirect: "follow",
      };

      const response = await fetch(
        `${API_URL}/comments/postComment`,
        requestOptions
      );
      const newComment = await response.json();

      if (newComment) {
        fetchData();
      }
    } catch (error) {
      console.error("🚀 ~ postAComment ~ error:", error);
    }
  };

  const deleteAComment = async (e, comment) => {
    e.preventDefault();

    const requestOptions = {
      method: "DELETE",
      redirect: "follow",
    };

    try {
      const response = await fetch(
        `${API_URL}/comments/${comment?._id}`,
        requestOptions
      );

      const deletedComment = await response.json();

      if (deletedComment) {
        fetchData();
      }
    } catch (error) {
      console.error("error", error);
    }
  };

  const updateLikesCounter = async (e, post) => {
    e.preventDefault();

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

    const urlencoded = new URLSearchParams();
    urlencoded.append("userId", userId);

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: urlencoded,
      redirect: "follow",
    };

    try {
      const response = await fetch(
        `${API_URL}/topics/${post._id}`,
        requestOptions
      );
      const result = await response.json();

      if (result) {
        fetchData();
      }
    } catch (error) {
      console.error("error", error);
      setServerMsg(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [collectionType, fetchData]);

  return (
    <>
      <main className="main">
        <div className="container">
          <div className="p-4 home-logo-container">
            <a className="aNormal" href="/">
              <img
                className="home-logo"
                src="https://res.cloudinary.com/djgxiadrc/image/upload/v1677334203/communityWebApp/Beige_und_Grau_Minimalistisch_Zitat_Instagram-Beitrag_Kopyas%C4%B1_6_g2r1na.png"
                alt="logo"
              />
            </a>
          </div>
          <h1 className="text-center mb-3 pb-1">Your Local Forum</h1>
          <div className="forum-container">
            <ForumSection
              collectionType={collectionType}
              handle_InSearch_Input={handle_InSearch_Input}
              handle_InSearch_Filter={handle_InSearch_Filter}
              handleShow={handleShow}
              handleTagsSelected={handleTagsSelected}
              handleClose={handleClose}
              setCollectionType={setCollectionType}
              setPostBody={setPostBody}
              setPostTitle={setPostTitle}
              postInForum={postInForum}
              postTitle={postTitle}
              postTitleRef={postTitleRef}
              postBodyRef={postBodyRef}
              postBody={postBody}
              searchInputRef={searchInputRef}
              show={show}
              availableTags={availableTags}
              postAComment={postAComment}
              deleteForumPost={deleteForumPost}
              deleteAComment={deleteAComment}
              updateLikesCounter={updateLikesCounter}
              serverMsg={serverMsg}
              loggedUser={loggedUser}
              filteredData={filteredData}
            />
          </div>
        </div>
      </main>
      <div className="footer">
        <p>&copy; 2023 My App. All rights reserved.</p>
      </div>
    </>
  );
}

export default Home;
