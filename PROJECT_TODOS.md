# EventFlow - Project TODO List & Recovery Guide

*Last Updated: Current Session*

## 🚨 **CRITICAL FIXES NEEDED** (High Priority)

### **1. Event Setup Page Issues** `app/event-setup/page.tsx`
**Problem**: Point of Contact and Team Support fields need major UX improvements

#### **1.1 Point of Contact Dropdown**
- **Current**: Text input for name + email/phone fields
- **Required**: Dropdown of existing team members + "Add New Person" option
- **Files to modify**: 
  - `app/event-setup/page.tsx` (lines ~569-614)
  - May need to load coaches/team members state
- **Note**: "Add New" should be for ANY personnel/team member, not just coaches

#### **1.2 Team Role Requirements (Replace "Coach Support Needed")**
- **Current**: Single dropdown with support levels (solo, assistant, team, full-support)
- **Required**: Multiple checkboxes for specific team roles needed
- **Use**: `TEAM_ROLES` constant from `lib/event-constants.ts`
- **Files to modify**:
  - `app/event-setup/page.tsx` (lines ~648-667)
  - `lib/types.ts` (update EventFormData interface)
  - `lib/validation.ts` (update validation schema)

### **2. Logistics Page Issues** `app/logistics/page.tsx`

#### **2.1 Arrival Time Dropdown**
- **Current**: Text input (lines ~887-891, ~960-964)
- **Problem**: Users can input random text, no standardization
- **Required**: Functional dropdown with options:
  - "3 hours before event"
  - "2 hours before event" 
  - "1 hour before event"
  - "30 minutes before event"
  - "At event start time"
  - "Custom" (shows time picker)
- **Benefits**: Better scheduling logic, prevents random inputs

#### **2.2 Team Assignment Coaches Dropdown Debug**
- **Current**: Should be working (lines ~829-850)
- **Problem**: User reports it's not showing coaches dropdown
- **Check**: 
  - `coaches` state loading (lines ~278-289)
  - `getCoaches()` function in `lib/firebase-coaches.ts`
  - Console errors during dropdown rendering

#### **2.3 Activities Tab - Missing Edit Functionality**
- **Current**: Activities tab exists but no edit feature
- **Problem**: Users can't modify event activities after creation
- **Required**: Add edit/delete/add buttons for activities
- **Impact**: Critical for event management workflow

### **3. Completion Flow Issues** `app/event-setup/page.tsx`

#### **3.1 Confusing Navigation (Step 4)**
- **Current**: Multiple competing buttons (Back, View Calendar, Create Another Event)
- **Problem**: Users confused about next steps, can escape before completing logistics
- **Required**: 
  - Remove confusing buttons
  - Force progression to logistics page
  - Create proper completion screen after logistics

#### **3.2 Missing Proper Finish Screen**
- **Current**: Basic completion with navigation buttons
- **Required**: Comprehensive finish screen with:
  - Event summary
  - Team assignments overview  
  - "Print Event Plan" button
  - Single "View in Calendar" button
  - Success messaging

## 🔧 **DATA CONSISTENCY & ARCHITECTURE**

### **4. Constants Management** ✅ *Mostly Complete*
- **Status**: `lib/event-constants.ts` created and mostly implemented
- **Remaining**: Apply role checkboxes to event setup
- **Files using constants**:
  - `app/page.tsx` ✅ 
  - `app/event-setup/page.tsx` ✅ (partial)
  - `app/logistics/page.tsx` ✅

### **5. Role-Based Assignment System** ✅ *Complete*
- **Status**: `lib/role-utils.ts` implemented
- **Features**: Auto-suggestion based on logistics assignments
- **Working**: Event Lead defaults, category-based suggestions

### **6. Single Source of Truth** ✅ *Complete*
- **Status**: All dropdowns sync between creation and edit flows
- **Verified**: Event types, marketing channels, task categories, etc.

## 📱 **UI/UX IMPROVEMENTS**

### **7. Modal & Sidebar Enhancements** ✅ *Complete*
- **Status**: Modal sizing, button visibility, sidebar defaults all fixed
- **Components**: `ModalButton.tsx`, `ModalHeader.tsx` created

### **8. Authentication & Caching** ✅ *Complete*
- **Status**: Auth refresh, cache invalidation, error handling all fixed
- **Features**: Proper deletion, cache cleanup, session management

## 🗂️ **FILE REFERENCE GUIDE**

### **Key Files for Current Fixes**:
```
📁 Core Files to Modify:
├── app/event-setup/page.tsx          # Point of Contact & Team Roles
├── app/logistics/page.tsx             # Arrival Time & Activities Edit
├── lib/event-constants.ts             # Add arrival time options
├── lib/types.ts                       # Update interfaces if needed
└── lib/validation.ts                  # Update validation schemas

📁 Reference Files:
├── lib/firebase-coaches.ts            # getCoaches() function
├── lib/role-utils.ts                  # Role assignment logic
└── components/Modal*.tsx              # Modal components (if needed)
```

### **State Management Patterns**:
```typescript
// Loading coaches pattern (use in event-setup):
const [coaches, setCoaches] = useState<Coach[]>([]);
useEffect(() => {
  const loadCoaches = async () => {
    const coachesData = await getCoaches();
    setCoaches(coachesData);
  };
  loadCoaches();
}, []);

// Arrival time options pattern:
const ARRIVAL_TIME_OPTIONS = [
  { value: '3-hours-before', label: '3 hours before event' },
  { value: '2-hours-before', label: '2 hours before event' },
  { value: '1-hour-before', label: '1 hour before event' },
  { value: '30-min-before', label: '30 minutes before event' },
  { value: 'event-start', label: 'At event start time' },
  { value: 'custom', label: 'Custom time' },
];
```

## 🔄 **RECOVERY PROCEDURES**

### **If Development Crashes**:
1. **Check Current Branch**: `git status`
2. **Restore Last Working State**: `git stash` if needed
3. **Restart Dev Server**: `npm run dev`
4. **Check Firebase Connection**: Verify `.env.local` file
5. **Review This TODO**: Reference this file for context

### **If Database Issues**:
1. **Check Firestore Rules**: `firestore.rules`
2. **Verify Authentication**: Test login/logout
3. **Clear Browser Cache**: localStorage issues
4. **Check Console Errors**: Firebase connection issues

### **If Build Fails**:
1. **Run Linter**: `npm run lint`
2. **Check TypeScript**: Missing imports, type errors
3. **Verify Constants**: Ensure all imports from `event-constants.ts`

## 📋 **IMPLEMENTATION ORDER**

**Recommended sequence to avoid conflicts**:
1. **Event Setup Point of Contact** (dropdown + add new)
2. **Event Setup Team Roles** (checkboxes)
3. **Logistics Arrival Time** (dropdown)
4. **Logistics Activities Edit** (add functionality)
5. **Completion Flow Redesign** (final UX)

## 🎯 **SUCCESS CRITERIA**

### **Event Setup**:
- [ ] Point of Contact shows coaches dropdown with "Add New Person"
- [ ] Team Roles shows checkboxes from TEAM_ROLES constant
- [ ] Form validation works with new field types
- [ ] Data saves correctly to Firebase

### **Logistics**:
- [ ] Arrival Time shows functional dropdown with proper options
- [ ] Team Assignment coaches dropdown loads and works
- [ ] Activities tab has edit/add/delete functionality
- [ ] All data persists correctly

### **Completion Flow**:
- [ ] Clean navigation without confusing buttons
- [ ] Proper finish screen with event summary
- [ ] Print functionality works
- [ ] Single clear path back to calendar

---

**💡 Remember**: User prefers minimal changes - only implement what's specifically requested. Always ask permission before making code changes.