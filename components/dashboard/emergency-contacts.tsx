"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, MapPin, Clock, AlertTriangle, Heart } from "lucide-react"

export function EmergencyContacts() {
  const emergencyContacts = [
    {
      name: "Bệnh viện Nhi Trung ương",
      specialty: "Tâm lý trẻ em & Phát triển",
      phone: "02439743556",
      address: "18/879 La Thành, Đống Đa, Hà Nội",
      hours: "24/7",
      type: "hospital",
    },
    {
      name: "BS. Nguyễn Thị Lan Anh",
      specialty: "Chuyên khoa Tâm lý phát triển",
      phone: "0912345678",
      address: "Phòng khám ABC, Cầu Giấy, Hà Nội",
      hours: "8:00 - 17:00 (T2-T6)",
      type: "doctor",
    },
    {
      name: "Trung tâm Can thiệp sớm",
      specialty: "Can thiệp tự kỷ & Phát triển",
      phone: "02435551234",
      address: "123 Nguyễn Trãi, Thanh Xuân, Hà Nội",
      hours: "8:00 - 18:00 (T2-T7)",
      type: "center",
    },
    {
      name: "Hotline Hỗ trợ Tâm lý",
      specialty: "Tư vấn tâm lý 24/7",
      phone: "19001234",
      address: "Tư vấn qua điện thoại",
      hours: "24/7",
      type: "hotline",
    },
  ]

  const getIcon = (type: string) => {
    switch (type) {
      case "hospital":
        return ""
      case "doctor":
        return "‍"
      case "center":
        return ""
      case "hotline":
        return ""
      default:
        return ""
    }
  }

  // Hàm gọi điện
  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`)
  }

  // Hàm mở Google Maps
  const handleMap = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    window.open(url, "_blank")
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Liên hệ khẩn cấp</h1>
        <p className="text-muted-foreground">
          Danh sách các bác sĩ, bệnh viện và trung tâm hỗ trợ chuyên về tự kỷ và phát triển trẻ em.
        </p>
      </div>

      {/* Emergency Alert */}
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200">Trường hợp khẩn cấp</h3>
              <p className="text-sm text-red-600 dark:text-red-300">
                Nếu trẻ có biểu hiện bất thường nghiêm trọng, hãy gọi ngay 115 hoặc đến bệnh viện gần nhất.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {emergencyContacts.map((contact, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getIcon(contact.type)}</span>
                  <div>
                    <CardTitle className="text-lg">{contact.name}</CardTitle>
                    <CardDescription>{contact.specialty}</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="font-medium">{contact.phone}</span>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="h-4 w-4 text-primary mt-0.5" />
                  <span className="text-sm text-muted-foreground">{contact.address}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">{contact.hours}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button size="sm" className="flex-1" onClick={() => handleCall(contact.phone)}>
                  <Phone className="mr-2 h-4 w-4" />
                  Gọi ngay
                </Button>
                {contact.type !== "hotline" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                    onClick={() => handleMap(contact.address)}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Chỉ đường
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
