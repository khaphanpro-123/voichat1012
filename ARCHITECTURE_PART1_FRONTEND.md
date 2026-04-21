# EnglishPal - Phân Tích Kiến Trúc Hệ Thống (Phần 1: Frontend)

## 📋 Frontend Architecture

### Framework & Technologies
- **Framework**: Next.js 15.5.9 (React 19)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4.15 + Framer Motion 12.23.12
- **UI Components**: Radix UI (comprehensive component library)
- **State Management**: React Hooks + SWR (for data fetching)
- **Authentication**: NextAuth 4.24.11

### Project Structure
```
app/
├── dashboard-new/          # Main dashboard pages
│   ├── ai-chat/           # AI Chat interface
│   ├── vocabulary/        # Vocabulary management
│   ├── documents-simple/  # Document upload & processing
│   ├── chat/              # Voice chat
│   ├── pronunciation/     # Pronunciation practice
│   ├── listening/         # Listening exercises
│   ├── writing-practice/  # Writing practice
│   └── image-learning/    # Image-based learning
├── api/                    # Next.js API routes (backend)
└── auth/                   # Authentication pages

components/
├── DashboardLayout.tsx     # Main layout wrapper
├── FloatingAiChat.tsx      # Floating AI chat widget
├── CameraCapture.tsx       # Camera capture component
└── VocabularyQuiz.tsx      # Quiz component

lib/
├── mongodb.ts             # MongoDB connection
├── file-processing-pipeline.ts  # File processing
└── redis-client.ts        # Redis connection
```

### Key Frontend Components

#### 1. DashboardLayout (components/DashboardLayout.tsx)
**Purpose**: Main layout wrapper for all dashboard pages

**Features**:
- Responsive sidebar (desktop/mobile)
- Navigation menu with 12+ pages
- User profile section
- Notifications panel
- Admin section (role-based)
- Logout confirmation modal

**State Management**:
```typescript
const [isSidebarOpen, setIsSidebarOpen] = useState(false);
const [isAdmin, setIsAdmin] = useState(false);
const [unreadCount, setUnreadCount] = useState(0);
const [level, setLevel] = useState(userLevel);
```

#### 2. FloatingAiChat (components/FloatingAiChat.tsx)
**Purpose**: Floating AI chat widget accessible from any page

**Features**:
- Minimize/maximize functionality
- Chat history persistence (localStorage)
- Real-time streaming responses
- Support for multiple AI providers (Groq, OpenAI, Gemini)

**Storage Keys**:
- `floating_aic_sessions`: Chat sessions
- `floating_aic_active`: Active chat ID

#### 3. CameraCapture (components/CameraCapture.tsx)
**Purpose**: Camera capture for document scanning

**Features**:
- Environment camera access
- Fallback camera support
- Image compression
- Error handling

**Browser APIs Used**:
- MediaStream API
- Canvas API
- Blob API

#### 4. Vocabulary Page (app/dashboard-new/vocabulary/page.tsx)
**Purpose**: Vocabulary management and learning

**Features**:
- Word list with filtering (type, source)
- Knowledge graph expansion
- Vietnamese translations
- Quiz mode with 3 question types
- Bilingual display (English + Vietnamese)

**Data Structure**:
```typescript
interface VocabularyWord {
  _id: string;
  word: string;
  meaning: string;
  meaningVi?: string;
  example: string;
  exampleVi?: string;
  type: string;
  level: string;
  timesReviewed: number;
  isLearned: boolean;
  source?: string;
  ipa?: string;
}
```

### Frontend Data Flow
```
User Action
    ↓
React Component (State Update)
    ↓
API Call (fetch/SWR)
    ↓
Next.js API Route
    ↓
Backend Processing
    ↓
Response → Component State
    ↓
UI Re-render
```

### Component Hierarchy
```
DashboardLayout
├── Sidebar
│   ├── Logo
│   ├── Navigation Menu
│   ├── Notifications Button
│   └── User Profile
├── Main Content
│   └── Page Component (ai-chat, vocabulary, etc.)
├── NotificationPanel
└── FloatingAiChat
    ├── Floating Button
    └── Chat Widget
        ├── Header
        ├── Messages
        └── Input
```

### State Management Pattern
```typescript
// Local component state
const [state, setState] = useState(initialValue);

// API data fetching
const { data, error, isLoading } = useSWR(url, fetcher);

// Form state
const { register, handleSubmit, watch } = useForm();

// localStorage persistence
useEffect(() => {
  localStorage.setItem(key, JSON.stringify(data));
}, [data]);
```

### Styling Approach
- **Utility-first CSS**: Tailwind CSS classes
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Support via next-themes
- **Animations**: Framer Motion for smooth transitions
- **Component Library**: Radix UI for accessible components

### Performance Optimizations
- Code splitting via Next.js dynamic imports
- Image optimization via next/image
- CSS-in-JS with Tailwind (no runtime overhead)
- Lazy loading for components
- localStorage caching for chat history

---

**Next**: See ARCHITECTURE_PART2_BACKEND.md for backend details
