import React from 'react';
import './HelpModal.css';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        <h2>How to Use Time Tracking</h2>
        <div className="instructions">
          <h3>Project Tracking with Hashtags</h3>
          <p>To track your time by project, simply create Google Calendar events that start with a hashtag (#).</p>
          
          <div className="example">
            <h4>Example:</h4>
            <p>#project Meeting with team</p>
            <p>#client Call with client</p>
            <p>#research Reading articles</p>
          </div>

          <h3>How It Works</h3>
          <ul>
            <li>The word after the hashtag (#) becomes your project name</li>
            <li>Events are automatically grouped by project</li>
            <li>Time spent on each project is calculated and displayed</li>
            <li>You can filter and view reports by project</li>
          </ul>

          <h3>Tips</h3>
          <ul>
            <li>Keep your project names consistent</li>
            <li>Use descriptive event titles after the hashtag</li>
            <li>You can use multiple hashtags in one event</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HelpModal; 