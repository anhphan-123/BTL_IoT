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
            className="profile-link"
            href="https://github.com/anhphan-123/BTL_IoT"
            target="_blank"
            rel="noreferrer"
          >
            <span className="profile-link-icon">⌘</span>
            <span>
              <strong>GitHub</strong>
              <small>GitHub project</small>
            </span>
          </a>

          <a
            className="profile-link"
            href="https://www.figma.com/design/30pKkVf4buzh3VOmgiMQsE/Untitled?node-id=0-1&t=Omhpo6eZ8bwDz08R-1"
            target="_blank"
            rel="noreferrer"
          >
            <span className="profile-link-icon">◈</span>
            <span>
              <strong>Figma</strong>
              <small>Figma design</small>
            </span>
          </a>

          <a
            className="profile-link"
            href="https://anhp-b23dcat018-7917810.postman.co/workspace/B23DCAT018---Phan-Anh's-Workspa~5e70cd83-27b7-4c28-8f10-6f3bb24e45be/collection/57565573-eb6507f7-0ae5-45fd-b1a6-21e04c5c03cd?action=share&source=copy-link&creator=57565573"
            target="_blank"
            rel="noreferrer"
          >
            <span className="profile-link-icon">◉</span>
            <span>
              <strong>Postman</strong>
              <small>API documentation</small>
            </span>
          </a>

          <a className="profile-link profile-link-disabled" href="#" aria-disabled="true">
            <span className="profile-link-icon">▤</span>
            <span>
              <strong>PDF Report</strong>
              <small>Chưa có liên kết trong source</small>
            </span>
          </a>

        </div>

      </div>
    </div>
  );
}

export default Profile;
