"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, X, Volume2, AlertCircle, Loader2, ChevronRight,
  Save, RefreshCw, PenLine, CheckCircle2, XCircle, Lightbulb, Edit3,
  Image as ImageIcon, Grid3X3, Sparkles, Clock, BookOpen, HelpCircle
} from "lucide-react";
import DashboardLayout from "./DashboardLayout";

// ============================================
// EXPANDED IMAGE DATABASE - 100+ images across 10 topics
// ============================================
const IMAGE_DATABASE = [
  // ANIMALS (20 images)
  { id: "dog", word: "dog", wordVi: "con chó", variants: ["dogs", "doggy"], category: "animals", image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400" },
  { id: "cat", word: "cat", wordVi: "con mèo", variants: ["cats", "kitty"], category: "animals", image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400" },
  { id: "bird", word: "bird", wordVi: "con chim", variants: ["birds"], category: "animals", image: "https://images.unsplash.com/photo-1444464666168-49d633b86797?w=400" },
  { id: "fish", word: "fish", wordVi: "con cá", variants: ["fishes", "fish"], category: "animals", image: "https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=400" },
  { id: "elephant", word: "elephant", wordVi: "con voi", variants: ["elephants"], category: "animals", image: "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=400" },
  { id: "rabbit", word: "rabbit", wordVi: "con thỏ", variants: ["rabbits"], category: "animals", image: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=400" },
  { id: "lion", word: "lion", wordVi: "con sư tử", variants: ["lions"], category: "animals", image: "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=400" },
  { id: "tiger", word: "tiger", wordVi: "con hổ", variants: ["tigers"], category: "animals", image: "https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=400" },
  { id: "bear", word: "bear", wordVi: "con gấu", variants: ["bears"], category: "animals", image: "https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=400" },
  { id: "monkey", word: "monkey", wordVi: "con khỉ", variants: ["monkeys"], category: "animals", image: "https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=400" },
  { id: "horse", word: "horse", wordVi: "con ngựa", variants: ["horses"], category: "animals", image: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=400" },
  { id: "cow", word: "cow", wordVi: "con bò", variants: ["cows"], category: "animals", image: "https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?w=400" },
  { id: "pig", word: "pig", wordVi: "con lợn", variants: ["pigs"], category: "animals", image: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400" },
  { id: "sheep", word: "sheep", wordVi: "con cừu", variants: ["sheep"], category: "animals", image: "https://images.unsplash.com/photo-1484557985045-edf25e08da73?w=400" },
  { id: "duck", word: "duck", wordVi: "con vịt", variants: ["ducks"], category: "animals", image: "https://images.unsplash.com/photo-1459682687441-7761439a709d?w=400" },
  { id: "chicken", word: "chicken", wordVi: "con gà", variants: ["chickens"], category: "animals", image: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400" },
  { id: "frog", word: "frog", wordVi: "con ếch", variants: ["frogs"], category: "animals", image: "https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=400" },
  { id: "snake", word: "snake", wordVi: "con rắn", variants: ["snakes"], category: "animals", image: "https://images.unsplash.com/photo-1531386151447-fd76ad50012f?w=400" },
  { id: "turtle", word: "turtle", wordVi: "con rùa", variants: ["turtles"], category: "animals", image: "https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=400" },
  { id: "butterfly", word: "butterfly", wordVi: "con bướm", variants: ["butterflies"], category: "animals", image: "https://images.unsplash.com/photo-1452570053594-1b985d6ea890?w=400" },

  // OBJECTS (20 images)
  { id: "book", word: "book", wordVi: "quyển sách", variants: ["books"], category: "objects", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400" },
  { id: "phone", word: "phone", wordVi: "điện thoại", variants: ["phones"], category: "objects", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400" },
  { id: "computer", word: "computer", wordVi: "máy tính", variants: ["computers"], category: "objects", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400" },
  { id: "chair", word: "chair", wordVi: "cái ghế", variants: ["chairs"], category: "objects", image: "https://images.unsplash.com/photo-1503602642458-232111445657?w=400" },
  { id: "table", word: "table", wordVi: "cái bàn", variants: ["tables"], category: "objects", image: "https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=400" },
  { id: "lamp", word: "lamp", wordVi: "cái đèn", variants: ["lamps"], category: "objects", image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400" },
  { id: "clock", word: "clock", wordVi: "đồng hồ", variants: ["clocks"], category: "objects", image: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=400" },
  { id: "bag", word: "bag", wordVi: "cái túi", variants: ["bags"], category: "objects", image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400" },
  { id: "key", word: "key", wordVi: "chìa khóa", variants: ["keys"], category: "objects", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400" },
  { id: "pen", word: "pen", wordVi: "cây bút", variants: ["pens"], category: "objects", image: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400" },
  { id: "cup", word: "cup", wordVi: "cái cốc", variants: ["cups"], category: "objects", image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400" },
  { id: "bottle", word: "bottle", wordVi: "cái chai", variants: ["bottles"], category: "objects", image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400" },
  { id: "camera", word: "camera", wordVi: "máy ảnh", variants: ["cameras"], category: "objects", image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400" },
  { id: "umbrella", word: "umbrella", wordVi: "cái ô", variants: ["umbrellas"], category: "objects", image: "https://images.unsplash.com/photo-1534309466160-70b22cc6252c?w=400" },
  { id: "glasses", word: "glasses", wordVi: "kính mắt", variants: ["glasses"], category: "objects", image: "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400" },
  { id: "watch", word: "watch", wordVi: "đồng hồ đeo tay", variants: ["watches"], category: "objects", image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400" },
  { id: "mirror", word: "mirror", wordVi: "cái gương", variants: ["mirrors"], category: "objects", image: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=400" },
  { id: "pillow", word: "pillow", wordVi: "cái gối", variants: ["pillows"], category: "objects", image: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400" },
  { id: "blanket", word: "blanket", wordVi: "cái chăn", variants: ["blankets"], category: "objects", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400" },
  { id: "towel", word: "towel", wordVi: "khăn tắm", variants: ["towels"], category: "objects", image: "https://images.unsplash.com/photo-1583845112203-29329902332e?w=400" },

  // FOOD (20 images)
  { id: "apple", word: "apple", wordVi: "quả táo", variants: ["apples"], category: "food", image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400" },
  { id: "banana", word: "banana", wordVi: "quả chuối", variants: ["bananas"], category: "food", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400" },
  { id: "orange", word: "orange", wordVi: "quả cam", variants: ["oranges"], category: "food", image: "https://images.unsplash.com/photo-1547514701-42782101795e?w=400" },
  { id: "bread", word: "bread", wordVi: "bánh mì", variants: ["breads"], category: "food", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400" },
  { id: "rice", word: "rice", wordVi: "cơm", variants: ["rice"], category: "food", image: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400" },
  { id: "egg", word: "egg", wordVi: "quả trứng", variants: ["eggs"], category: "food", image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400" },
  { id: "milk", word: "milk", wordVi: "sữa", variants: ["milk"], category: "food", image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400" },
  { id: "cheese", word: "cheese", wordVi: "phô mai", variants: ["cheeses"], category: "food", image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400" },
  { id: "chicken_food", word: "chicken", wordVi: "thịt gà", variants: ["chicken"], category: "food", image: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400" },
  { id: "fish_food", word: "fish", wordVi: "cá (thức ăn)", variants: ["fish"], category: "food", image: "https://images.unsplash.com/photo-1510130387422-82bed34b37e9?w=400" },
  { id: "pizza", word: "pizza", wordVi: "bánh pizza", variants: ["pizzas"], category: "food", image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400" },
  { id: "burger", word: "burger", wordVi: "bánh burger", variants: ["burgers"], category: "food", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400" },
  { id: "salad", word: "salad", wordVi: "salad", variants: ["salads"], category: "food", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400" },
  { id: "soup", word: "soup", wordVi: "súp", variants: ["soups"], category: "food", image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400" },
  { id: "cake", word: "cake", wordVi: "bánh ngọt", variants: ["cakes"], category: "food", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400" },
  { id: "ice_cream", word: "ice cream", wordVi: "kem", variants: ["ice creams"], category: "food", image: "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400" },
  { id: "coffee", word: "coffee", wordVi: "cà phê", variants: ["coffees"], category: "food", image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400" },
  { id: "tea", word: "tea", wordVi: "trà", variants: ["teas"], category: "food", image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400" },
  { id: "water", word: "water", wordVi: "nước", variants: ["water"], category: "food", image: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400" },
  { id: "juice", word: "juice", wordVi: "nước ép", variants: ["juices"], category: "food", image: "https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=400" },

  // ACTIVITIES (15 images)
  { id: "run", word: "run", wordVi: "chạy", variants: ["runs", "running", "ran", "runner"], category: "activities", image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400" },
  { id: "swim", word: "swim", wordVi: "bơi", variants: ["swims", "swimming", "swam", "swum", "swimmer"], category: "activities", image: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400" },
  { id: "read", word: "read", wordVi: "đọc", variants: ["reads", "reading", "reader"], category: "activities", image: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=400" },
  { id: "write", word: "write", wordVi: "viết", variants: ["writes", "writing", "wrote", "written", "writer"], category: "activities", image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400" },
  { id: "cook", word: "cook", wordVi: "nấu ăn", variants: ["cooks", "cooking", "cooked", "cooker"], category: "activities", image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400" },
  { id: "dance", word: "dance", wordVi: "nhảy múa", variants: ["dances", "dancing", "danced", "dancer"], category: "activities", image: "https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=400" },
  { id: "sing", word: "sing", wordVi: "hát", variants: ["sings", "singing", "sang", "sung", "singer"], category: "activities", image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400" },
  { id: "play", word: "play", wordVi: "chơi", variants: ["plays", "playing", "played", "player"], category: "activities", image: "https://images.unsplash.com/photo-1472745942893-4b9f730c7668?w=400" },
  { id: "sleep", word: "sleep", wordVi: "ngủ", variants: ["sleeps", "sleeping", "slept"], category: "activities", image: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400" },
  { id: "eat", word: "eat", wordVi: "ăn", variants: ["eats", "eating", "ate", "eaten"], category: "activities", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400" },
  { id: "drink", word: "drink", wordVi: "uống", variants: ["drinks", "drinking", "drank", "drunk"], category: "activities", image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400" },
  { id: "walk", word: "walk", wordVi: "đi bộ", variants: ["walks", "walking", "walked", "walker"], category: "activities", image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400" },
  { id: "study", word: "study", wordVi: "học", variants: ["studies", "studying", "studied", "student"], category: "activities", image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400" },
  { id: "work", word: "work", wordVi: "làm việc", variants: ["works", "working", "worked", "worker"], category: "activities", image: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=400" },
  { id: "travel", word: "travel", wordVi: "du lịch", variants: ["travels", "traveling", "traveled", "traveler"], category: "activities", image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400" },

  // NATURE (10 images)
  { id: "tree", word: "tree", wordVi: "cây", variants: ["trees"], category: "nature", image: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400" },
  { id: "flower", word: "flower", wordVi: "hoa", variants: ["flowers"], category: "nature", image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400" },
  { id: "mountain", word: "mountain", wordVi: "núi", variants: ["mountains"], category: "nature", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400" },
  { id: "river", word: "river", wordVi: "sông", variants: ["rivers"], category: "nature", image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400" },
  { id: "ocean", word: "ocean", wordVi: "đại dương", variants: ["oceans"], category: "nature", image: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400" },
  { id: "sun", word: "sun", wordVi: "mặt trời", variants: ["suns"], category: "nature", image: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=400" },
  { id: "moon", word: "moon", wordVi: "mặt trăng", variants: ["moons"], category: "nature", image: "https://images.unsplash.com/photo-1532693322450-2cb5c511067d?w=400" },
  { id: "star", word: "star", wordVi: "ngôi sao", variants: ["stars"], category: "nature", image: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400" },
  { id: "cloud", word: "cloud", wordVi: "đám mây", variants: ["clouds"], category: "nature", image: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=400" },
  { id: "rain", word: "rain", wordVi: "mưa", variants: ["rains", "raining", "rainy"], category: "nature", image: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=400" },

  // PLACES (10 images)
  { id: "house", word: "house", wordVi: "ngôi nhà", variants: ["houses"], category: "places", image: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400" },
  { id: "school", word: "school", wordVi: "trường học", variants: ["schools"], category: "places", image: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400" },
  { id: "hospital", word: "hospital", wordVi: "bệnh viện", variants: ["hospitals"], category: "places", image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400" },
  { id: "park", word: "park", wordVi: "công viên", variants: ["parks"], category: "places", image: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400" },
  { id: "beach", word: "beach", wordVi: "bãi biển", variants: ["beaches"], category: "places", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400" },
  { id: "restaurant", word: "restaurant", wordVi: "nhà hàng", variants: ["restaurants"], category: "places", image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400" },
  { id: "library", word: "library", wordVi: "thư viện", variants: ["libraries"], category: "places", image: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=400" },
  { id: "airport", word: "airport", wordVi: "sân bay", variants: ["airports"], category: "places", image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400" },
  { id: "market", word: "market", wordVi: "chợ", variants: ["markets"], category: "places", image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400" },
  { id: "office", word: "office", wordVi: "văn phòng", variants: ["offices"], category: "places", image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400" },

  // TRANSPORTATION (10 images)
  { id: "car", word: "car", wordVi: "xe hơi", variants: ["cars"], category: "transportation", image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400" },
  { id: "bus", word: "bus", wordVi: "xe buýt", variants: ["buses"], category: "transportation", image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400" },
  { id: "train", word: "train", wordVi: "tàu hỏa", variants: ["trains"], category: "transportation", image: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=400" },
  { id: "plane", word: "plane", wordVi: "máy bay", variants: ["planes"], category: "transportation", image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400" },
  { id: "bicycle", word: "bicycle", wordVi: "xe đạp", variants: ["bicycles", "bike", "bikes"], category: "transportation", image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400" },
  { id: "motorcycle", word: "motorcycle", wordVi: "xe máy", variants: ["motorcycles", "motorbike"], category: "transportation", image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400" },
  { id: "boat", word: "boat", wordVi: "thuyền", variants: ["boats"], category: "transportation", image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400" },
  { id: "ship", word: "ship", wordVi: "tàu thủy", variants: ["ships"], category: "transportation", image: "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=400" },
  { id: "taxi", word: "taxi", wordVi: "taxi", variants: ["taxis"], category: "transportation", image: "https://images.unsplash.com/photo-1529369623266-f5264b696110?w=400" },
  { id: "truck", word: "truck", wordVi: "xe tải", variants: ["trucks"], category: "transportation", image: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400" },
];

const CATEGORIES = [
  { id: "all", label: "Tất cả", icon: "🌟" },
  { id: "animals", label: "Động vật", icon: "🐾" },
  { id: "objects", label: "Đồ vật", icon: "📦" },
  { id: "food", label: "Thức ăn", icon: "🍎" },
  { id: "activities", label: "Hoạt động", icon: "🏃" },
  { id: "nature", label: "Thiên nhiên", icon: "🌳" },
  { id: "places", label: "Địa điểm", icon: "🏠" },
  { id: "transportation", label: "Phương tiện", icon: "🚗" },
];

// Image refresh cycle (10 days)
const REFRESH_CYCLE_DAYS = 10;
const LAST_REFRESH_KEY = "image_vocab_last_refresh";

interface SentenceCheck {
  sentence: string;
  isCorrect: boolean;
  correctedSentence: string;
  errors: Array<{
    type: string;
    original: string;
    corrected: string;
    explanation: string;
    explanationVi: string;
    position?: string;
    errorWord?: string;
    errorPosition?: string;
    errorMessage?: string;
    errorIndex?: number;
  }>;
  vietnameseTranslation: string;
  hasTargetWord: boolean;
  isDuplicate: boolean;
  grammarRule?: string;
  grammarRuleVi?: string;
  encouragement?: string;
  detectedVariant?: string;
}

type Step = "guide" | "select" | "guess" | "sentences" | "checking" | "results";


export default function ImageVocabularyLearning() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id || "anonymous";

  // Guide modal state
  const [showGuide, setShowGuide] = useState(true);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Main states
  const [step, setStep] = useState<Step>("guide");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedImage, setSelectedImage] = useState<typeof IMAGE_DATABASE[0] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Countdown days
  const [daysLeft, setDaysLeft] = useState(REFRESH_CYCLE_DAYS);

  // Step 2: Guess
  const [userGuess, setUserGuess] = useState("");
  const [guessAttempts, setGuessAttempts] = useState(0);
  const [guessResult, setGuessResult] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  // Step 3-4: Sentences (NOW 2 SENTENCES INSTEAD OF 4)
  const [sentences, setSentences] = useState<string[]>(["", ""]);
  const [checkedSentences, setCheckedSentences] = useState<SentenceCheck[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedSentence, setEditedSentence] = useState("");

  // Results
  const [saved, setSaved] = useState(false);

  // Check guide preference and countdown on mount
  useEffect(() => {
    // Check if user dismissed guide
    const guideHidden = localStorage.getItem("image_vocab_guide_hidden");
    if (guideHidden) {
      const hiddenDate = new Date(guideHidden);
      const daysSinceHidden = Math.floor((Date.now() - hiddenDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceHidden < 7) {
        setShowGuide(false);
        setStep("select");
      }
    }

    // Calculate days left for image refresh
    const lastRefresh = localStorage.getItem(LAST_REFRESH_KEY);
    if (lastRefresh) {
      const lastDate = new Date(lastRefresh);
      const daysPassed = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      const remaining = Math.max(0, REFRESH_CYCLE_DAYS - daysPassed);
      setDaysLeft(remaining);

      // If cycle complete, reset
      if (remaining === 0) {
        localStorage.setItem(LAST_REFRESH_KEY, new Date().toISOString());
        setDaysLeft(REFRESH_CYCLE_DAYS);
      }
    } else {
      localStorage.setItem(LAST_REFRESH_KEY, new Date().toISOString());
    }
  }, []);

  // Filter images by category
  const filteredImages = useMemo(() => {
    if (selectedCategory === "all") return IMAGE_DATABASE;
    return IMAGE_DATABASE.filter(img => img.category === selectedCategory);
  }, [selectedCategory]);

  // Normalize text for comparison
  const normalize = (text: string) => text.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Check if word matches (including variants)
  const isWordMatch = (input: string, target: typeof IMAGE_DATABASE[0]) => {
    const normalizedInput = normalize(input);
    const normalizedWord = normalize(target.word);
    if (normalizedInput === normalizedWord) return true;
    return target.variants.some(v => normalize(v) === normalizedInput);
  };

  // Check if sentence contains target word
  const sentenceContainsWord = (sentence: string, target: typeof IMAGE_DATABASE[0]) => {
    const words = normalize(sentence).split(/\s+/);
    const targetWords = [normalize(target.word), ...target.variants.map(normalize)];
    return words.some(w => targetWords.includes(w));
  };

  // Handle guide confirmation
  const handleGuideConfirm = () => {
    if (dontShowAgain) {
      localStorage.setItem("image_vocab_guide_hidden", new Date().toISOString());
    }
    setShowGuide(false);
    setStep("select");
  };

  // Step 1: Select image
  const handleSelectImage = (img: typeof IMAGE_DATABASE[0]) => {
    setSelectedImage(img);
    setStep("guess");
  };

  // Step 2: Check guess
  const handleGuessSubmit = () => {
    if (!userGuess.trim() || !selectedImage) return;

    const isCorrect = isWordMatch(userGuess, selectedImage);
    const newAttempts = guessAttempts + 1;
    setGuessAttempts(newAttempts);

    if (isCorrect) {
      setGuessResult({ isCorrect: true, message: "🎉 Chính xác! Bạn đã nhập đúng từ!" });
      setTimeout(() => setStep("sentences"), 1500);
    } else {
      if (newAttempts >= 3) {
        setShowAnswer(true);
        setGuessResult({ isCorrect: false, message: `❌ Sai 3 lần. Từ đúng là "${selectedImage.word}"` });
      } else {
        setGuessResult({ isCorrect: false, message: `❌ Chưa đúng! Còn ${3 - newAttempts} lần thử.` });
      }
      setUserGuess("");
    }
  };

  // Skip after 3 wrong
  const handleSkipToSentences = () => {
    setStep("sentences");
  };

  // Step 3: Validate sentences before checking grammar (NOW 2 SENTENCES)
  const validateSentences = (): string | null => {
    if (!selectedImage) return "Chưa chọn ảnh";

    const validSentences = sentences.filter(s => s.trim());
    if (validSentences.length < 2) return `Vui lòng viết đủ 2 câu (còn thiếu ${2 - validSentences.length} câu)`;

    // Check for target word
    for (let i = 0; i < 2; i++) {
      if (!sentenceContainsWord(sentences[i], selectedImage)) {
        return `Câu ${i + 1} chưa chứa từ "${selectedImage.word}" hoặc biến thể của nó`;
      }
    }

    // Check for duplicates
    const normalized = sentences.map(s => normalize(s));
    const unique = new Set(normalized);
    if (unique.size < 2) return "Có câu bị trùng lặp. Vui lòng viết 2 câu khác nhau.";

    return null;
  };

  // Step 4: Check grammar with AI (NOW 2 SENTENCES)
  const handleCheckSentences = async () => {
    const validationError = validateSentences();
    if (validationError) {
      setError(validationError);
      return;
    }

    setStep("checking");
    setIsLoading(true);
    setError(null);

    const results: SentenceCheck[] = [];
    const normalizedSentences = sentences.map(s => normalize(s));

    for (let i = 0; i < 2; i++) {
      const sentence = sentences[i];
      const isDuplicate = normalizedSentences.indexOf(normalize(sentence)) !== i;
      const hasTargetWord = sentenceContainsWord(sentence, selectedImage!);

      try {
        const res = await fetch("/api/image-vocabulary-learning", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "checkSentence", sentence, targetWord: selectedImage!.word, userId })
        });
        const data = await res.json();

        if (data.success) {
          results.push({ sentence, hasTargetWord, isDuplicate, ...data.data });
        } else {
          results.push({
            sentence, hasTargetWord, isDuplicate, isCorrect: false,
            correctedSentence: "", errors: [], vietnameseTranslation: ""
          });
        }
      } catch {
        results.push({
          sentence, hasTargetWord, isDuplicate, isCorrect: false,
          correctedSentence: "", errors: [], vietnameseTranslation: ""
        });
      }
    }

    setCheckedSentences(results);
    setIsLoading(false);
    setStep("results");
  };

  // Edit and resubmit sentence
  const handleEditSentence = (index: number) => {
    setEditingIndex(index);
    setEditedSentence(checkedSentences[index].sentence);
  };

  const handleResubmitSentence = async () => {
    if (editingIndex === null || !selectedImage || !editedSentence.trim()) return;

    if (!sentenceContainsWord(editedSentence, selectedImage)) {
      setError(`Câu phải chứa từ "${selectedImage.word}"`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/image-vocabulary-learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkSentence", sentence: editedSentence, targetWord: selectedImage.word, userId })
      });
      const data = await res.json();

      if (data.success) {
        const newChecked = [...checkedSentences];
        newChecked[editingIndex] = {
          sentence: editedSentence,
          hasTargetWord: true,
          isDuplicate: false,
          ...data.data
        };
        setCheckedSentences(newChecked);
      }
    } catch (err) {
      console.error("Recheck error:", err);
    } finally {
      setIsLoading(false);
      setEditingIndex(null);
      setEditedSentence("");
    }
  };

  // Save results
  const handleSave = async () => {
    if (!selectedImage) return;
    setIsLoading(true);

    try {
      const structures = checkedSentences
        .filter(s => s.isCorrect)
        .map(s => ({ pattern: "", explanation: "", example: s.sentence }));

      const errors = checkedSentences
        .filter(s => !s.isCorrect && s.errors?.length > 0)
        .flatMap(s => s.errors.map(e => ({
          original: e.original || "",
          corrected: e.corrected || "",
          type: e.type || "grammar",
          explanation: e.explanation || ""
        })));

      await fetch("/api/image-vocabulary-learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveAll", userId,
          vocabulary: { word: selectedImage.word, meaning: selectedImage.wordVi, partOfSpeech: "noun" },
          structures, errors
        })
      });

      setSaved(true);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset
  const handleReset = () => {
    setStep("select");
    setSelectedImage(null);
    setUserGuess("");
    setGuessAttempts(0);
    setGuessResult(null);
    setShowAnswer(false);
    setSentences(["", ""]);
    setCheckedSentences([]);
    setEditingIndex(null);
    setEditedSentence("");
    setSaved(false);
    setError(null);
  };

  // Speak
  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  const correctCount = checkedSentences.filter(s => s.isCorrect).length;
  const wrongCount = checkedSentences.filter(s => !s.isCorrect).length;

  // Error type labels
  const getErrorTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      subject_verb_agreement: "Chia động từ",
      article: "Mạo từ (a/an/the)",
      singular_plural: "Số ít/số nhiều",
      spelling: "Chính tả",
      punctuation: "Dấu câu",
      word_order: "Trật tự từ",
      word_type: "Sai loại từ",
      tense: "Thì động từ",
      grammar: "Ngữ pháp chung",
      missing_verb: "Thiếu động từ",
      comparative: "Lỗi so sánh",
      capitalization: "Viết hoa",
      verb_form_after_attitude: "Dạng động từ sau like/love",
      missing_subject: "Thiếu chủ ngữ",
      question_form: "Cấu trúc câu hỏi",
      negation: "Câu phủ định",
      tense_agreement: "Hợp tác thì"
    };
    return labels[type] || type.replace(/_/g, " ");
  };

  const getErrorSuggestion = (type: string): string => {
    const suggestions: Record<string, string> = {
      subject_verb_agreement: "Ngôi 3 số ít (he/she/it) → động từ thêm -s/-es",
      article: "Danh từ đếm được số ít cần a/an/the",
      singular_plural: "Chú ý danh từ đếm được cần mạo từ hoặc dạng số nhiều",
      spelling: "Đọc nhiều và ghi nhớ cách viết từ",
      punctuation: "Nhớ kết thúc câu bằng dấu chấm (.)",
      word_order: "Ghi nhớ cấu trúc S + V + O trong tiếng Anh",
      word_type: "Phân biệt danh từ (N), động từ (V), tính từ (Adj)",
      tense: "Ôn lại các thì cơ bản và dấu hiệu nhận biết",
      missing_verb: "Câu tiếng Anh cần có động từ (is/are/was/were...)",
      comparative: "Dùng 'much' + tính từ so sánh hơn, không dùng 'very'",
      capitalization: "Nhớ viết hoa 'I' và chữ cái đầu câu",
      verb_form_after_attitude: "Sau like/love/hate dùng V-ing hoặc to V",
      missing_subject: "Câu cần có chủ ngữ rõ ràng (I/You/He/She...)",
      question_form: "Câu hỏi Yes/No: Do/Does + S + V?",
      negation: "He/She/It dùng doesn't, I/You/We/They dùng don't",
      tense_agreement: "can/will/should + V nguyên mẫu"
    };
    return suggestions[type] || "Luyện tập thêm để cải thiện";
  };


  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-4">
        <div className="max-w-5xl mx-auto">
          {/* Header with countdown banner */}
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              <ImageIcon className="w-6 h-6 text-pink-400" />
              Học từ vựng qua hình ảnh
            </h1>
            <p className="text-white/60 text-sm mt-1">Chọn ảnh → Nhập từ → Viết 2 câu → Kiểm tra ngữ pháp</p>
          </div>

          {/* Countdown Banner */}
          <div className={`mb-4 p-3 rounded-xl flex items-center justify-center gap-2 ${
            daysLeft === 0 ? "bg-green-500/20 border border-green-500/30" : "bg-blue-500/20 border border-blue-500/30"
          }`}>
            <Clock className={`w-4 h-4 ${daysLeft === 0 ? "text-green-400" : "text-blue-400"}`} />
            <span className={`text-sm ${daysLeft === 0 ? "text-green-300" : "text-blue-300"}`}>
              {daysLeft === 0
                ? "🔄 Hôm nay thay ảnh — kho đã cập nhật!"
                : `🕒 Còn ${daysLeft} ngày để thay ảnh mới (${IMAGE_DATABASE.length} ảnh trong kho)`
              }
            </span>
          </div>

          {/* Guide Modal */}
          <AnimatePresence>
            {showGuide && step === "guide" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-slate-800 rounded-2xl p-6 max-w-lg w-full border border-white/20"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-pink-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Hướng dẫn học từ vựng</h2>
                      <p className="text-white/60 text-sm">4 bước đơn giản để ghi nhớ từ vựng</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex gap-3 p-3 bg-white/5 rounded-xl">
                      <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">1</div>
                      <div>
                        <p className="text-white font-medium">Chọn ảnh từ kho</p>
                        <p className="text-white/60 text-sm">Lọc theo chủ đề: động vật, đồ vật, thức ăn, hoạt động...</p>
                      </div>
                    </div>

                    <div className="flex gap-3 p-3 bg-white/5 rounded-xl">
                      <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">2</div>
                      <div>
                        <p className="text-white font-medium">Nhập từ tiếng Anh</p>
                        <p className="text-white/60 text-sm">Đoán từ vựng cho đối tượng trong ảnh (tối đa 3 lần)</p>
                      </div>
                    </div>

                    <div className="flex gap-3 p-3 bg-white/5 rounded-xl">
                      <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">3</div>
                      <div>
                        <p className="text-white font-medium">Viết 2 câu với từ vựng</p>
                        <p className="text-white/60 text-sm">Sử dụng từ gốc hoặc biến thể (swim, swimming, swimmer...)</p>
                      </div>
                    </div>

                    <div className="flex gap-3 p-3 bg-white/5 rounded-xl">
                      <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">4</div>
                      <div>
                        <p className="text-white font-medium">Nhận phản hồi chi tiết</p>
                        <p className="text-white/60 text-sm">AI kiểm tra ngữ pháp, chỉ rõ lỗi và gợi ý sửa</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      id="dontShow"
                      checked={dontShowAgain}
                      onChange={(e) => setDontShowAgain(e.target.checked)}
                      className="w-4 h-4 rounded border-white/30 bg-white/10"
                    />
                    <label htmlFor="dontShow" className="text-white/60 text-sm">Không hiển thị lại trong 7 ngày</label>
                  </div>

                  <button
                    onClick={handleGuideConfirm}
                    className="w-full py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Đã hiểu, bắt đầu học
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress Steps */}
          {step !== "guide" && (
            <div className="flex items-center justify-center gap-2 mb-6">
              {[
                { id: "select", label: "Chọn ảnh" },
                { id: "guess", label: "Nhập từ" },
                { id: "sentences", label: "Viết 2 câu" },
                { id: "results", label: "Kết quả" }
              ].map((s, i) => {
                const stepOrder = ["select", "guess", "sentences", "results"];
                const currentIndex = stepOrder.indexOf(step === "checking" ? "results" : step);
                const isActive = step === s.id || (s.id === "results" && step === "checking");
                const isPast = stepOrder.indexOf(s.id) < currentIndex;
                return (
                  <div key={s.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        isActive ? "bg-pink-500 text-white scale-110" : isPast ? "bg-green-500 text-white" : "bg-white/20 text-white/50"
                      }`}>
                        {isPast ? <Check className="w-5 h-5" /> : i + 1}
                      </div>
                      <span className={`text-xs mt-1 ${isActive ? "text-pink-400" : "text-white/50"}`}>{s.label}</span>
                    </div>
                    {i < 3 && <ChevronRight className="w-4 h-4 text-white/30 mx-2" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm flex-1">{error}</p>
              <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-400" /></button>
            </div>
          )}

          {/* Step 1: Select Image */}
          {step === "select" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Grid3X3 className="w-5 h-5 text-pink-400" />
                    Bước 1: Chọn ảnh để học từ vựng
                  </h2>
                  <button
                    onClick={() => { setShowGuide(true); setStep("guide"); }}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                    title="Xem hướng dẫn"
                  >
                    <HelpCircle className="w-5 h-5 text-white/60" />
                  </button>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                        selectedCategory === cat.id
                          ? "bg-pink-500 text-white"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>

                {/* Image count */}
                <p className="text-white/50 text-sm mb-4">
                  Hiển thị {filteredImages.length} ảnh {selectedCategory !== "all" && `trong chủ đề "${CATEGORIES.find(c => c.id === selectedCategory)?.label}"`}
                </p>

                {/* Image Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[500px] overflow-y-auto pr-2">
                  {filteredImages.map(img => (
                    <button
                      key={img.id}
                      onClick={() => handleSelectImage(img)}
                      className="group relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-pink-500 transition-all"
                    >
                      <img
                        src={img.image}
                        alt={img.word}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                        <span className="text-white font-medium text-xs">Chọn</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Guess the word */}
          {step === "guess" && selectedImage && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <PenLine className="w-5 h-5 text-pink-400" />
                Bước 2: Nhập từ tiếng Anh cho đối tượng
              </h2>

              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/2">
                  <img src={selectedImage.image} alt="Target" className="w-full aspect-square object-cover rounded-xl" />
                </div>

                <div className="md:w-1/2 flex flex-col justify-center">
                  <p className="text-white/70 mb-4">Đây là gì? Nhập từ tiếng Anh:</p>

                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={userGuess}
                      onChange={(e) => setUserGuess(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !showAnswer && handleGuessSubmit()}
                      placeholder="Nhập từ tiếng Anh..."
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-lg focus:border-pink-500 transition"
                      disabled={showAnswer || guessResult?.isCorrect}
                    />
                    <button
                      onClick={handleGuessSubmit}
                      disabled={!userGuess.trim() || showAnswer || guessResult?.isCorrect}
                      className="px-6 py-3 bg-pink-500 text-white rounded-xl disabled:opacity-50"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>

                  {guessAttempts > 0 && !guessResult?.isCorrect && !showAnswer && (
                    <p className="text-orange-400 text-sm mb-2">Số lần thử: {guessAttempts}/3</p>
                  )}

                  {guessResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-xl ${guessResult.isCorrect ? "bg-green-500/20 border border-green-500/50" : "bg-orange-500/20 border border-orange-500/50"}`}
                    >
                      <p className={`font-medium ${guessResult.isCorrect ? "text-green-300" : "text-orange-300"}`}>
                        {guessResult.message}
                      </p>

                      {(guessResult.isCorrect || showAnswer) && (
                        <div className="mt-3 flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-xl">{selectedImage.word}</span>
                            <button onClick={() => speak(selectedImage.word)} className="p-1 hover:bg-white/10 rounded">
                              <Volume2 className="w-5 h-5 text-white/60" />
                            </button>
                          </div>
                          <span className="text-green-300">= {selectedImage.wordVi}</span>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {showAnswer && !guessResult?.isCorrect && (
                    <button
                      onClick={handleSkipToSentences}
                      className="mt-4 w-full py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-xl font-medium"
                    >
                      Tiếp tục viết câu →
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Write 2 sentences */}
          {step === "sentences" && selectedImage && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <PenLine className="w-5 h-5 text-pink-400" />
                Bước 3: Viết 2 câu với từ "{selectedImage.word}"
              </h2>
              <p className="text-white/60 text-sm mb-4">
                Viết 2 câu khác nhau có chứa từ <span className="text-pink-400 font-bold">"{selectedImage.word}"</span> hoặc biến thể ({selectedImage.variants.join(", ")})
              </p>

              <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-xl">
                <p className="text-blue-300 text-sm flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Gợi ý: Thử viết câu khẳng định và câu hỏi, hoặc các thì khác nhau
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {sentences.map((s, i) => {
                  const hasWord = s.trim() && sentenceContainsWord(s, selectedImage);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-white/40 w-6 text-center">{i + 1}.</span>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={s}
                          onChange={(e) => {
                            const newSentences = [...sentences];
                            newSentences[i] = e.target.value;
                            setSentences(newSentences);
                          }}
                          placeholder={`Câu ${i + 1} với từ "${selectedImage.word}"...`}
                          className={`w-full bg-white/10 border rounded-xl px-4 py-3 text-white transition ${
                            s.trim() ? (hasWord ? "border-green-500/50" : "border-red-500/50") : "border-white/20"
                          }`}
                        />
                        {s.trim() && (
                          <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${hasWord ? "text-green-400" : "text-red-400"}`}>
                            {hasWord ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleCheckSentences}
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                Kiểm tra ngữ pháp
              </button>
            </motion.div>
          )}

          {/* Step 4: Checking */}
          {step === "checking" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center">
              <Loader2 className="w-12 h-12 text-pink-400 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Đang kiểm tra ngữ pháp...</h2>
              <p className="text-white/60">AI đang phân tích từng câu của bạn</p>
            </motion.div>
          )}

          {/* Step 4: Results */}
          {step === "results" && selectedImage && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Summary */}
              <div className="bg-white/10 backdrop-blur rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-green-300 font-medium">{correctCount} câu đúng</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-300 font-medium">{wrongCount} câu cần sửa</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!saved ? (
                    <button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Lưu kết quả
                    </button>
                  ) : (
                    <span className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg font-medium flex items-center gap-2">
                      <Check className="w-4 h-4" /> Đã lưu
                    </span>
                  )}
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-white/20"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Học từ mới
                  </button>
                </div>
              </div>

              {/* Checked sentences */}
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  Kết quả kiểm tra ngữ pháp
                </h3>

                <div className="space-y-4">
                  {checkedSentences.map((s, i) => (
                    <div key={i} className={`p-4 rounded-xl transition-all ${
                      s.isCorrect ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"
                    }`}>
                      {editingIndex === i ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editedSentence}
                            onChange={(e) => setEditedSentence(e.target.value)}
                            className="w-full bg-white/10 border border-white/30 rounded-lg px-4 py-2 text-white"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleResubmitSentence}
                              disabled={isLoading}
                              className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                            >
                              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              Kiểm tra lại
                            </button>
                            <button
                              onClick={() => { setEditingIndex(null); setEditedSentence(""); }}
                              className="px-4 py-2 bg-gray-500 text-white rounded-lg"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          {s.isCorrect ? (
                            <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                          )}

                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-white font-medium">Câu {i + 1}: {s.sentence}</p>
                              {!s.isCorrect && (
                                <button
                                  onClick={() => handleEditSentence(i)}
                                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition"
                                  title="Sửa và nộp lại"
                                >
                                  <Edit3 className="w-4 h-4 text-white/70" />
                                </button>
                              )}
                            </div>

                            {!s.isCorrect && s.correctedSentence && (
                              <p className="text-green-300 text-sm mt-1 flex items-center gap-1">
                                <Check className="w-4 h-4" /> Gợi ý: {s.correctedSentence}
                              </p>
                            )}

                            {s.vietnameseTranslation && (
                              <p className="text-white/60 text-sm mt-1">🇻🇳 {s.vietnameseTranslation}</p>
                            )}

                            {/* Grammar errors */}
                            {s.errors && s.errors.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {s.errors.map((e, j) => (
                                  <div key={j} className="text-sm bg-red-500/20 rounded-lg p-2">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <span className="px-2 py-0.5 bg-red-500/30 text-red-300 rounded text-xs font-medium">
                                        {getErrorTypeLabel(e.type)}
                                      </span>
                                      {(e.errorWord || e.errorPosition) && (
                                        <span className="text-white/50 text-xs">
                                          {e.errorWord && <span className="text-orange-300">"{e.errorWord}"</span>}
                                          {e.errorPosition && <span> - {e.errorPosition}</span>}
                                        </span>
                                      )}
                                    </div>
                                    {e.errorMessage && (
                                      <p className="text-red-300 text-xs mb-1">❌ {e.errorMessage}</p>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <span className="text-red-300 line-through">{e.original || e.errorWord}</span>
                                      <span className="text-white/40">→</span>
                                      <span className="text-green-300 font-medium">{e.corrected}</span>
                                    </div>
                                    {e.explanationVi && (
                                      <p className="text-white/60 text-xs mt-1 italic">💡 {e.explanationVi}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Encouragement */}
                            {s.encouragement && (
                              <div className={`mt-2 p-2 rounded-lg ${s.isCorrect ? "bg-green-500/20" : "bg-yellow-500/20"}`}>
                                <p className={`text-sm ${s.isCorrect ? "text-green-300" : "text-yellow-300"}`}>
                                  💬 {s.encouragement}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
