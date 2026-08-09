# Camera Troubleshooting Guide

## 🎥 Camera Not Working on Smartphone - Solutions

### Problem: Camera button doesn't respond when clicked

**Possible Causes:**
1. Camera permissions not granted
2. HTTPS not enabled (required for camera access)
3. Browser doesn't support camera API
4. Another app is using the camera
5. Camera hardware issue

---

## ✅ Solutions (Try in Order)

### 1. **Check Camera Permissions**

**iOS (iPhone/iPad):**
- Go to Settings → Privacy → Camera
- Find your browser (Safari, Chrome, etc.)
- Make sure it's set to "Allow"
- If it says "Never", tap it and change to "Allow"

**Android:**
- Go to Settings → Apps → [Your Browser]
- Tap Permissions → Camera
- Make sure Camera is "Allowed"
- If it says "Deny", tap it and change to "Allow"

### 2. **Use HTTPS (Required)**

Camera access only works on HTTPS (secure connection).

**Check if using HTTPS:**
- Look at the URL bar
- Should show 🔒 lock icon
- URL should start with `https://`

**If using HTTP:**
- The camera will NOT work
- You must use HTTPS
- Contact your admin to enable HTTPS

### 3. **Try a Different Browser**

Some browsers have better camera support:

**Recommended:**
- ✅ Chrome (Android)
- ✅ Safari (iOS)
- ✅ Firefox (Android)

**May have issues:**
- ⚠️ Samsung Internet
- ⚠️ Opera
- ⚠️ UC Browser

### 4. **Clear Browser Cache**

Sometimes cached data causes issues:

**Chrome:**
- Settings → Privacy → Clear browsing data
- Select "Cookies and other site data"
- Select "Cached images and files"
- Click "Clear data"

**Safari:**
- Settings → Safari → Clear History and Website Data

### 5. **Restart Your Phone**

Simple but effective:
- Turn off your phone completely
- Wait 10 seconds
- Turn it back on
- Try camera again

### 6. **Check if Another App Uses Camera**

If another app is using the camera, you can't access it:
- Close all other apps
- Especially: Zoom, Teams, WhatsApp, Instagram
- Try camera again

### 7. **Check Browser Compatibility**

Your browser must support the Camera API:

**Supported:**
- ✅ Chrome 53+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ Edge 79+

**Not supported:**
- ❌ Internet Explorer
- ❌ Opera Mini
- ❌ UC Browser

---

## 🔍 Debug Mode - Check Console Logs

To see detailed error messages:

1. **Open Developer Console:**
   - Android Chrome: Press F12 or Ctrl+Shift+I
   - iOS Safari: Settings → Advanced → Web Inspector
   - Other browsers: Right-click → Inspect → Console

2. **Look for messages starting with `[Camera]`:**
   ```
   [Camera] Starting camera...
   [Camera] Requesting environment camera...
   [Camera] Environment camera granted
   [Camera] Stream assigned to video element
   [Camera] Video metadata loaded
   ```

3. **Common Error Messages:**

   | Error | Meaning | Solution |
   |-------|---------|----------|
   | `NotAllowedError` | Permission denied | Grant camera permission in settings |
   | `NotFoundError` | No camera found | Check if device has camera |
   | `NotReadableError` | Camera in use | Close other apps using camera |
   | `SecurityError` | HTTPS required | Use HTTPS connection |
   | `Video not ready yet` | Camera loading | Wait a few seconds |

---

## 📱 Mobile-Specific Tips

### iPhone/iPad (iOS)

1. **Use Safari** (best compatibility)
2. **Check Privacy Settings:**
   - Settings → Privacy → Camera
   - Make sure app has permission
3. **Try Landscape Mode:**
   - Rotate phone to landscape
   - Sometimes works better
4. **Update iOS:**
   - Settings → General → Software Update
   - Ensure latest version

### Android Phone

1. **Use Chrome** (best compatibility)
2. **Check App Permissions:**
   - Settings → Apps → [Browser] → Permissions
   - Enable Camera permission
3. **Try Safe Mode:**
   - Restart in Safe Mode
   - See if camera works
   - If yes, another app is interfering
4. **Update Android:**
   - Settings → About → System Update
   - Ensure latest version

---

## 🛠️ Advanced Troubleshooting

### Test Camera Directly

Try this test page to verify camera works:
```
https://www.webrtc-experiment.com/
```

If camera works there but not on our app:
- Browser cache issue
- Try clearing cache (see above)
- Try different browser

### Check Network Connection

Camera needs stable connection:
- Use WiFi instead of mobile data
- Move closer to WiFi router
- Check signal strength

### Disable Browser Extensions

Some extensions block camera:
- Chrome: Settings → Extensions
- Disable all extensions
- Try camera again
- Re-enable one by one to find culprit

---

## 📞 Still Not Working?

If you've tried all solutions:

1. **Check the error message in console** (see Debug Mode above)
2. **Note the exact error**
3. **Try on a different device** (borrow a friend's phone)
4. **Try on a different network** (use different WiFi)
5. **Contact support with:**
   - Device type (iPhone/Android)
   - Browser name and version
   - Error message from console
   - What you've already tried

---

## ✨ Tips for Best Results

### Before Using Camera

- ✅ Close other apps
- ✅ Ensure good lighting
- ✅ Use HTTPS connection
- ✅ Grant camera permission
- ✅ Use supported browser

### While Using Camera

- ✅ Hold phone steady
- ✅ Keep camera lens clean
- ✅ Ensure good lighting
- ✅ Wait for video to load (2-3 seconds)
- ✅ Click "Chụp ảnh" when ready

### After Capturing

- ✅ Check image preview
- ✅ Retake if blurry
- ✅ Click "Hủy" to try again

---

## 🎯 Quick Checklist

Before contacting support, verify:

- [ ] Using HTTPS (🔒 lock icon visible)
- [ ] Camera permission granted in settings
- [ ] Using supported browser (Chrome, Safari, Firefox)
- [ ] No other apps using camera
- [ ] Phone has stable internet connection
- [ ] Tried restarting phone
- [ ] Tried clearing browser cache
- [ ] Checked console for error messages
- [ ] Tried on different WiFi network
- [ ] Tried on different device

---

## 📚 Resources

- [WebRTC Camera Test](https://www.webrtc-experiment.com/)
- [MDN - getUserMedia API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Browser Compatibility](https://caniuse.com/stream)

---

**Last Updated:** 2026-04-21
**Status:** ✅ Production Ready
