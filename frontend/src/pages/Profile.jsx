import avatar from "../images/Logo_PTIT_University.png";
function Profile() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Profile</h1>
          <p>Thông tin dự án</p>
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-avatar">
          <img src={avatar} alt="Avatar" />
        </div>

        <h2>Phan Anh</h2>

        <p>
          IoT Monitoring System
        </p>

        <div className="profile-links">
          <a href="https://github.com/anhphan-123/BTL_IoT">
            GitHub
          </a>

          <a href="#">
            Figma
          </a>

          <a href="#">
            Postman API
          </a>

          <a href="#">
            PDF Báo cáo
          </a>
        </div>
      </div>
    </div>
  );
}

export default Profile;