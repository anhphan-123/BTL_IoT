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
        <div className="avatar">
          👤
        </div>

        <h2>Tên sinh viên</h2>

        <p>
          IoT Monitoring System
        </p>

        <div className="profile-links">
          <a href="#">
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