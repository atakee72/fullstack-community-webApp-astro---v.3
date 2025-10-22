import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useForumStore } from '../stores/forumStore';
import ImageUpload from './ImageUpload';

export default function UserProfile() {
  const { user, updateProfile, logout, checkAuth } = useAuthStore();
  const { topics } = useForumStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [profileData, setProfileData] = useState({
    userName: '',
    email: '',
    hobbies: [] as string[],
    userPicture: ''
  });
  const [newHobby, setNewHobby] = useState('');

  useEffect(() => {
    setIsClient(true);
    // Check authentication on mount
    if (typeof window !== 'undefined') {
      checkAuth();
    }
  }, []);

  useEffect(() => {
    if (isClient && user) {
      setProfileData({
        userName: user.userName || '',
        email: user.email || '',
        hobbies: user.hobbies || [],
        userPicture: user.userPicture || ''
      });
    }
  }, [user, isClient]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  const addHobby = () => {
    if (newHobby.trim()) {
      setProfileData({
        ...profileData,
        hobbies: [...profileData.hobbies, newHobby.trim()]
      });
      setNewHobby('');
    }
  };

  const removeHobby = (index: number) => {
    setProfileData({
      ...profileData,
      hobbies: profileData.hobbies.filter((_, i) => i !== index)
    });
  };

  const handleSave = async () => {
    try {
      await updateProfile(profileData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleImageUpload = (url: string) => {
    setProfileData({ ...profileData, userPicture: url });
    // Also update the profile immediately
    updateProfile({ userPicture: url });
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const userTopics = topics.filter(topic => {
    const authorId = typeof topic.author === 'object' && topic.author !== null ? topic.author._id : topic.author;
    return authorId === user?._id;
  });

  // Show loading during SSR or while checking auth
  if (!isClient) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin inline-block">⏳</div>
          <p className="text-xl text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-xl mb-4 text-gray-700">Please log in to view your profile</p>
          <a href="/login" className="inline-block bg-[#4b9aaa] text-white px-8 py-3 rounded-lg hover:bg-[#3a7888] transition-colors font-semibold">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-[#4b9aaa] to-[#3a7888] p-8 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              {isEditing ? (
                <ImageUpload
                  onUpload={handleImageUpload}
                  uploadType="profile"
                  currentImage={profileData.userPicture}
                />
              ) : (
                <img
                  src={profileData.userPicture || `https://ui-avatars.com/api/?name=${profileData.userName}&background=814256&color=fff&size=200`}
                  alt={profileData.userName}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl"
                />
              )}
              <div>
                <h1 className="text-4xl font-bold mb-2">{profileData.userName}</h1>
                <p className="text-white/90 text-lg">{profileData.email}</p>
                {user?.roleBadge && (
                  <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                    {user.roleBadge}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-6 py-3 bg-white text-[#4b9aaa] rounded-lg hover:bg-gray-100 transition-all font-semibold shadow-md"
              >
                {isEditing ? '✕ Cancel' : '✏️ Edit Profile'}
              </button>
              <button
                onClick={handleLogout}
                className="px-6 py-3 bg-[#814256] text-white rounded-lg hover:bg-[#6a3646] transition-all font-semibold shadow-md"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Profile Details */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-[#814256] mb-6 flex items-center gap-2">
              <span>👤</span> Profile Information
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Username</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="userName"
                    value={profileData.userName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#4b9aaa] transition-colors"
                  />
                ) : (
                  <p className="text-lg font-medium text-gray-800">{profileData.userName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#4b9aaa] transition-colors"
                  />
                ) : (
                  <p className="text-lg font-medium text-gray-800">{profileData.email}</p>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="mt-6 flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-[#4b9aaa] text-white px-4 py-2 rounded-lg hover:bg-[#3a7888] transition-colors font-semibold"
                >
                  💾 Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors font-semibold"
                >
                  ✕ Cancel
                </button>
              </div>
            )}
          </div>

          {/* Hobbies Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
            <h3 className="text-xl font-bold text-[#814256] mb-4 flex items-center gap-2">
              <span>🎯</span> Hobbies & Interests
            </h3>
            {isEditing ? (
              <div>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newHobby}
                    onChange={(e) => setNewHobby(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHobby())}
                    placeholder="Type and press + to add"
                    className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#4b9aaa]"
                  />
                  <button
                    onClick={addHobby}
                    className="bg-[#4b9aaa] text-white px-4 py-2 rounded-lg hover:bg-[#3a7888] transition-colors font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profileData.hobbies.map((hobby, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 bg-[#eccc6e] text-[#814256] px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {hobby}
                      <button
                        onClick={() => removeHobby(index)}
                        className="hover:text-red-600 transition-colors ml-1"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profileData.hobbies.length > 0 ? (
                  profileData.hobbies.map((hobby, index) => (
                    <span
                      key={index}
                      className="bg-[#aca89f] text-white px-3 py-1.5 rounded-full text-sm font-medium"
                    >
                      {hobby}
                    </span>
                  ))
                ) : (
                  <p className="text-gray-500 italic">No hobbies added yet</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - User Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-[#814256] mb-6 flex items-center gap-2">
              <span>📝</span> Your Topics
            </h2>

            {userTopics.length > 0 ? (
              <div className="grid gap-4 max-h-[600px] overflow-y-auto pr-2">
                {userTopics.map((topic) => (
                  <div
                    key={topic._id}
                    className="bg-gradient-to-r from-gray-50 to-white p-5 rounded-xl border border-gray-200 hover:shadow-lg transition-all hover:border-[#4b9aaa] cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-[#4b9aaa]">{topic.title}</h3>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {new Date(topic.date).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-gray-600 mb-3 line-clamp-2">{topic.description}</p>

                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        {topic.tags?.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-[#eccc6e] text-[#814256] px-2 py-1 rounded-full font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                        {topic.tags?.length > 3 && (
                          <span className="text-xs text-gray-500">+{topic.tags.length - 3} more</span>
                        )}
                      </div>

                      <div className="flex gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          💬 {topic.comments?.length || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          👍 {topic.likes?.length || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          👀 {topic.views || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-gray-500 text-lg mb-4">You haven't created any topics yet</p>
                <a
                  href="/"
                  className="inline-block bg-[#4b9aaa] text-white px-6 py-3 rounded-lg hover:bg-[#3a7888] transition-colors font-semibold"
                >
                  Create Your First Topic
                </a>
              </div>
            )}
          </div>

          {/* Stats Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
            <h3 className="text-xl font-bold text-[#814256] mb-4 flex items-center gap-2">
              <span>📊</span> Community Stats
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-[#4b9aaa]/10 to-[#4b9aaa]/5 rounded-lg">
                <div className="text-3xl font-bold text-[#4b9aaa]">{userTopics.length}</div>
                <div className="text-sm text-gray-600 mt-1">Topics</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-[#814256]/10 to-[#814256]/5 rounded-lg">
                <div className="text-3xl font-bold text-[#814256]">
                  {userTopics.reduce((acc, t) => acc + (t.comments?.length || 0), 0)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Comments</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-[#eccc6e]/30 to-[#eccc6e]/10 rounded-lg">
                <div className="text-3xl font-bold text-[#c9aa4c]">
                  {userTopics.reduce((acc, t) => acc + (t.likes?.length || 0), 0)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Likes</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}