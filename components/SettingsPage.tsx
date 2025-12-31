"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Globe,
  Target,
  Camera,
  Save,
  Loader,
  CheckCircle,
} from "lucide-react";

interface UserProfile {
  userId: string;
  fullName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  country?: string;
  nativeLanguage?: string;
  learningGoals?: string[];
  level?: string;
  avatar?: string;
  bio?: string;
  interests?: string[];
  studyTime?: number;
  streak?: number;
  xp?: number;
}

const countries = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Spain", "Italy", "Japan", "South Korea", "China", "Vietnam",
  "Thailand", "Singapore", "Malaysia", "Indonesia", "Philippines", "India",
];

const languages = [
  "English", "Spanish", "French", "German", "Chinese", "Japanese",
  "Korean", "Thai", "Vietnamese", "Indonesian", "Tagalog", "Hindi",
];

const goalOptions = [
  "Travel", "Business", "Education", "Family", "Culture", "Career",
];

const interestOptions = [
  "Food", "Music", "Movies", "Sports", "Technology", "Art",
  "History", "Literature", "Gaming", "Travel",
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile>({
    userId: "user123", // In production, get from auth
    level: "Beginner",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/profile/${profile.userId}`);
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        if (data.profile.avatar) {
          setAvatarPreview(data.profile.avatar);
        }
      }
    } catch (error) {
      console.error("Load profile error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    const formData = new FormData();
    formData.append("avatar", file);
    formData.append("userId", profile.userId);

    try {
      const res = await fetch("/api/upload-avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setProfile({ ...profile, avatar: data.avatarUrl });
        setMessage("Avatar uploaded successfully!");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error) {
      console.error("Avatar upload error:", error);
      setMessage("Failed to upload avatar");
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: any) => {
    setProfile({ ...profile, [field]: value });
  };

  const toggleArrayItem = (field: "learningGoals" | "interests", item: string) => {
    const current = profile[field] || [];
    const updated = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    setProfile({ ...profile, [field]: updated });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/profile/${profile.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      const data = await res.json();
      if (data.success) {
        setMessage("Profile saved successfully!");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error) {
      console.error("Save profile error:", error);
      setMessage("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      {/* Success Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3"
        >
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800 font-medium">{message}</span>
        </motion.div>
      )}

      <div className="space-y-6">
        {/* Avatar Section */}
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Profile Picture</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-white" />
                )}
              </div>
              <button
                onClick={handleAvatarClick}
                className="absolute bottom-0 right-0 w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white hover:bg-teal-700 transition"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{profile.fullName || "User"}</p>
              <p className="text-sm text-gray-600">{profile.level}</p>
              <p className="text-xs text-gray-500 mt-1">
                Click camera icon to upload new photo
              </p>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Personal Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Full Name
              </label>
              <input
                type="text"
                value={profile.fullName || ""}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <input
                type="email"
                value={profile.email || ""}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone
              </label>
              <input
                type="tel"
                value={profile.phone || ""}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="+1 234 567 8900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Date of Birth
              </label>
              <input
                type="date"
                value={profile.dateOfBirth || ""}
                onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Gender
              </label>
              <select
                value={profile.gender || ""}
                onChange={(e) => handleInputChange("gender", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Globe className="w-4 h-4 inline mr-2" />
                Country
              </label>
              <select
                value={profile.country || ""}
                onChange={(e) => handleInputChange("country", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="">Select country</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Native Language
            </label>
            <select
              value={profile.nativeLanguage || ""}
              onChange={(e) => handleInputChange("nativeLanguage", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="">Select language</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              value={profile.bio || ""}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
              placeholder="Tell us about yourself..."
            />
          </div>
        </div>

        {/* Learning Goals */}
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            <Target className="w-5 h-5 inline mr-2" />
            Learning Goals
          </h2>
          <div className="flex flex-wrap gap-3">
            {goalOptions.map((goal) => (
              <button
                key={goal}
                onClick={() => toggleArrayItem("learningGoals", goal)}
                className={`px-4 py-2 rounded-xl font-medium transition ${
                  profile.learningGoals?.includes(goal)
                    ? "bg-teal-500 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>

        {/* Interests */}
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Interests</h2>
          <div className="flex flex-wrap gap-3">
            {interestOptions.map((interest) => (
              <button
                key={interest}
                onClick={() => toggleArrayItem("interests", interest)}
                className={`px-4 py-2 rounded-xl font-medium transition ${
                  profile.interests?.includes(interest)
                    ? "bg-purple-500 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full px-6 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-lg font-bold rounded-xl hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {isSaving ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
