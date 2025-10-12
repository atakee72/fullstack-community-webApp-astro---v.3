import { useContext, useRef, useState } from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Nav from "react-bootstrap/Nav";
import transformDate from "../utils/transformDate";
import { AuthContext } from "../store/AuthContext.js";
import { Badge } from "react-bootstrap";
import AccordionItem from "./AccordionItem";
import CommentModal from "./CommentModal";
import DeletePostButton from "./DeletePostButton";
import "./Cards.css";

function Cards({ item, serverMsg, forumHandlers }) {
  const {
    postAComment,
    deleteForumPost,
    deleteAComment,
    updateLikesCounter,
  } = forumHandlers;
  const { post, comments, author } = item;
  const [activeTab, setActiveTab] = useState("Posts");
  const commentTextRef = useRef();
  const likeRef = useRef();
  const [commentText, setCommentText] = useState("");
  const { userId, loggedUser } = useContext(AuthContext);
  const [show, setShow] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => {
    setShow(true);
  };

  return (
    <Card className="m-4 ms-5 me-5 p-4 card card-container">
      <DeletePostButton
        showAlert={showAlert}
        setShowAlert={setShowAlert}
        author={author}
        deleteForumPost={deleteForumPost}
        post={post}
      />

      <Card.Header>
        <Nav variant="tabs" defaultActiveKey="Posts">
          <Nav.Item>
            <Button
              variant="light"
              color="blue"
              onClick={() => setActiveTab("Posts")}
              active={activeTab === "Posts"}
            >
              Posts
            </Button>
          </Nav.Item>

          <Nav.Item>
            <Button
              variant="light"
              color="blue"
              onClick={() => setActiveTab("Comments")}
              active={activeTab === "Comments"}
            >
              Comments <Badge bg="secondary">{comments?.length}</Badge>
            </Button>
          </Nav.Item>

          <Nav.Item>
            <Button
              variant="light"
              color="blue"
              onClick={() => {
                handleShow();
                setActiveTab("newComment");
              }}
              active={activeTab === "newComment"}
              disabled={!loggedUser}
            >
              Write a comment
            </Button>
          </Nav.Item>
        </Nav>
      </Card.Header>
      {activeTab === "Posts" && post && (
        <Card.Body>
          <div>
            <i>
              <h6 className="card-header-info">
                <span className="card-header-info-span">
                  Date: {transformDate(post.date)} - Views: {post.views}
                  <button
                    className="like-button"
                    ref={likeRef}
                    onClick={(e) => {
                      updateLikesCounter(e, post);
                    }}
                  >
                    {post?.likedBy?.includes(userId) ? "💗" : "🤍"}
                    {post?.likes}
                  </button>
                  {author?.userName}{" "}
                  {
                    <img
                      className="author-image"
                      src={post.author?.userPicture}
                      alt="author"
                    />
                  }
                </span>
              </h6>
            </i>
            <Card.Title>{post?.title}</Card.Title>
            <Card.Text>{post.body}</Card.Text>

            <>
              <ul className="m-1 p-1 tags-list">
                {post?.tags.map((tag, i) => (
                  <li key={i}>
                    <span> Tags: {tag} </span>
                  </li>
                ))}
              </ul>
            </>
            <>
              <div>
                {post?.tags.map((tag, i) => (
                  <span key={i} className="tag-span">
                    {tag}
                  </span>
                ))}
              </div>
            </>
          </div>
        </Card.Body>
      )}
      {activeTab === "Comments" && comments && (
        <Card.Body>
          <AccordionItem
            comments={comments}
            setCommentShow={setCommentShow}
            deleteAComment={deleteAComment}
          />
        </Card.Body>
      )}
      {activeTab === "newComment" && (
        <Card.Body className="new-comment-body">
          <CommentModal
            show={show}
            handleClose={handleClose}
            setActiveTab={setActiveTab}
            commentText={commentText}
            setCommentText={setCommentText}
            commentTextRef={commentTextRef}
            postAComment={postAComment}
            post={post}
          />
        </Card.Body>
      )}
    </Card>
  );
}

export default Cards;
