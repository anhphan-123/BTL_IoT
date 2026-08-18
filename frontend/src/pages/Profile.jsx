import avatar from "../images/Logo_PTIT_University.png";

function Profile() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Profile</h1>
          <p>Thông tin cá nhân và dự án</p>
        </div>
      </div>

      <div className="profile-card">

        <div className="profile-avatar">
          <img
            src={avatar}
            alt="Avatar"
          />
        </div>

        {/* THÔNG TIN SINH VIÊN */}
<div className="student-info">

  <div className="student-info-row">
    <span className="student-label">
      Họ tên
    </span>

    <strong className="student-value">
      Phan Anh
    </strong>
  </div>

  <div className="student-info-row">
    <span className="student-label">
      Mã sinh viên
    </span>

    <strong className="student-value">
      B23DCAT018
    </strong>
  </div>

</div>



        <div className="profile-links">

          <a
            href="https://github.com/anhphan-123/BTL_IoT"
            target="_blank"
            rel="noreferrer"
          >
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