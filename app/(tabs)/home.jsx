import { Text, View, ScrollView, Image, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Animated, Easing, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { useRouter, useFocusEffect } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import ProjectDetailModal from "../../components/ProjectDetailModal";
import Avatar from "../../components/Avatar";
import ImageLightbox from "../../components/ImageLightbox";
import { updateProject, addProject } from "../../store/slices/projectsSlice";
import { addNotification } from "../../store/slices/notificationSlice";
import { setInventoryLoading, setInventoryData, setInventoryError } from "../../store/slices/inventorySlice";
import { projectOverviewApi } from "../../services/api";
import { visitService } from "../../services/visitService";

import { dealService } from "../../services/dealService";
import { inventoryService } from "../../services/inventoryService";

// Skeleton shimmer box
const SkeletonBox = ({ width, height, borderRadius = 8, style }) => {
    const shimmer = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, [shimmer]);
    const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });
    return <Animated.View style={[{ width, height, borderRadius, backgroundColor: "#E2E8F0", opacity }, style]} />;
};
const HOME_TABS = ["Overview", "Inventory", "Visits", "Deals"];
const DROPDOWN_LAYER = 2147483647;
const INVENTORY_TABS = [
    { key: "apartment", label: "Apartment" },
    { key: "villa", label: "Villa" },
    { key: "rowhouse", label: "Rowhouse" },
    { key: "plot", label: "Plot" },
    { key: "shop", label: "Shop" },
    { key: "showroom", label: "Showroom" },
    { key: "office", label: "Office" },
];
const STATUS_OPTIONS = ["Available", "Booked", "Sold"];

const PIPELINE_STAGE_META = {
    new_lead: {
        label: "Officer Assigned",
        sublabel: "Pending field officer acceptance & initial contact",
        badgeBg: "#EFF6FF",
        badgeText: "#1D4ED8",
        badgeBorder: "#BFDBFE",
        icon: "time-outline",
    },
    first_contact: {
        label: "Contact Initiated",
        sublabel: "Field officer contacted for project verification",
        badgeBg: "#EEF2FF",
        badgeText: "#4338CA",
        badgeBorder: "#C7D2FE",
        icon: "call-outline",
    },
    follow_up: {
        label: "Officer Follow-up",
        sublabel: "Follow-up and site verification in progress",
        badgeBg: "#FFFBEB",
        badgeText: "#B45309",
        badgeBorder: "#FDE68A",
        icon: "refresh-outline",
    },
    meeting_scheduled: {
        label: "Meeting Completed",
        sublabel: "Field officer completed onboarding meeting",
        badgeBg: "#FAF5FF",
        badgeText: "#7E22CE",
        badgeBorder: "#E9D5FF",
        icon: "calendar-outline",
    },
    interested: {
        label: "Under Admin Review",
        sublabel: "Admin reviewing field officer verification report",
        badgeBg: "#ECFEFF",
        badgeText: "#0E7490",
        badgeBorder: "#A5F3FC",
        icon: "shield-outline",
    },
    in_review: {
        label: "Final Verification",
        sublabel: "Pending Admin approval to make project live",
        badgeBg: "#FFF7ED",
        badgeText: "#C2410C",
        badgeBorder: "#FFEDD5",
        icon: "document-text-outline",
    },
    project_live: {
        label: "Live & Approved",
        sublabel: "Active and listed on user app & inventory",
        badgeBg: "#ECFDF5",
        badgeText: "#047857",
        badgeBorder: "#A7F3D0",
        icon: "checkmark-circle",
    },
    rejected: {
        label: "Project Rejected",
        sublabel: "Project was not approved by administration",
        badgeBg: "#FEF2F2",
        badgeText: "#B91C1C",
        badgeBorder: "#FECACA",
        icon: "close-circle",
    },
};

export default function Home() {
    const router = useRouter();
    const dispatch = useDispatch();
    const projectsData = useSelector((state) => state.projects.projects);
    const notifications = useSelector((state) => state.notifications?.list || []);
    const inventoryByProject = useSelector((state) => state.inventory.byProject);
    const inventoryLoading = useSelector((state) => state.inventory.loading);
    const authUser = useSelector((state) => state.auth.user);
    const isKycCompleted = useSelector((state) => state.auth.isKycCompleted);
    const [activeTab, setActiveTab] = useState("Overview");

    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const [isImageLightboxVisible, setIsImageLightboxVisible] = useState(false);
    const [isProjectDetailVisible, setIsProjectDetailVisible] = useState(false);
    const [selectedDeal, setSelectedDeal] = useState(null);
    const [isInventoryEditVisible, setIsInventoryEditVisible] = useState(false);
    const [inventoryEditTarget, setInventoryEditTarget] = useState(null);
    const [editPrice, setEditPrice] = useState("");
    const [editArea, setEditArea] = useState("");
    const [editStatus, setEditStatus] = useState("Available");
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const [inventoryType, setInventoryType] = useState("apartment");
    const [selectedTower, setSelectedTower] = useState("tower-a");
    const [selectedPlotStack, setSelectedPlotStack] = useState("stack-a");
    const [selectedPlotUnit, setSelectedPlotUnit] = useState("A-1202");

    // API state
    const [projectsList, setProjectsList] = useState([]);
    const [overviewData, setOverviewData] = useState(null);
    const [overviewLoading, setOverviewLoading] = useState(false);
    const [selectedRangeByType, setSelectedRangeByType] = useState({});

    // Visits state
    const [visitStats, setVisitStats] = useState(null);
    const [upcomingVisits, setUpcomingVisits] = useState([]);
    const [visitsLoading, setVisitsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [realProjectId, setRealProjectId] = useState(null);
    const [projectsLoading, setProjectsLoading] = useState(true);
    const [backendProjects, setBackendProjects] = useState([]);

    // Deals state
    const [deals, setDeals] = useState([]);
    const [dealsLoading, setDealsLoading] = useState(false);

    // Unit detail loading state (for modal)
    const [unitDetailLoading, setUnitDetailLoading] = useState(false);

    const tabs = HOME_TABS;
    const inventoryTabs = INVENTORY_TABS;
    const statusOptions = STATUS_OPTIONS;
    const insets = useSafeAreaInsets();
    const headerAnimation = useRef(new Animated.Value(1)).current;
    const expandedHeaderHeight = Math.max(insets.top, 20) + 221;
    const compactHeaderHeight = Math.max(insets.top, 20) + 66;
    const animatedHeaderHeight = headerAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [compactHeaderHeight, expandedHeaderHeight],
    });
    const overviewHeaderTranslateY = headerAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [-28, 0],
    });
    const compactHeaderOpacity = headerAnimation.interpolate({
        inputRange: [0, 0.55, 1],
        outputRange: [1, 0, 0],
    });
    const compactHeaderTranslateY = headerAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 12],
    });

    const getBadgeStyle = (status) => {
        switch (status) {
            case "Available":
                return "bg-emerald-100 text-emerald-600";
            case "Booked":
                return "bg-amber-100 text-amber-600";
            case "Sold":
                return "bg-rose-100 text-rose-500";
            default:
                return "bg-gray-100 text-gray-500";
        }
    };

    // Fetch project list for dropdown
    const fetchProjectsList = useCallback(async () => {
        try {
            const res = await projectOverviewApi.getProjectsList();
            const list = res.data?.data || [];
            console.log('📋 [HOME] projectsList fetched:', list.length, list.map(p => p.name));
            setProjectsList(list);
            if (list.length > 0) {
                setSelectedProjectId(list[0].id);
            }
        } catch (error) {
            console.error('❌ [HOME] Failed to fetch projects list:', error?.response?.status, error?.message);
        }
    }, []);

    // Fetch overview for selected project
    const fetchOverview = useCallback(async (projectId) => {
        if (!projectId) return;
        try {
            setOverviewLoading(true);
            const res = await projectOverviewApi.getProjectOverview(projectId);
            const data = res.data?.data || null;
            console.log('🏗️ [OVERVIEW] header:', JSON.stringify(data?.header));
            setOverviewData(data);
        } catch (error) {
            console.error('Failed to fetch project overview:', error);
            setOverviewData(null);
        } finally {
            setOverviewLoading(false);
        }
    }, []);

    // fetchProjectsList replaced by fetchBackendProjects which sets projectsList directly
    useEffect(() => { fetchOverview(selectedProjectId); }, [selectedProjectId, fetchOverview]);

    const selectedProject = projectsData.find((project) => project.id === selectedProjectId) || projectsData[0] || { inventory: {} };
    const unreadNotifications = notifications.filter(item => !item.watched).length;



    const getInventoryDealTemplate = (inventoryTypeValue, unit) => {
        const deals = selectedProject.deals || [];
        const propertyLabel = (unit?.title || unit?.meta || inventoryTypeValue || "").toLowerCase();

        const exactMatch = deals.find((deal) => (deal.propertyType || "").toLowerCase().includes(propertyLabel) || propertyLabel.includes((deal.propertyType || "").toLowerCase()));
        if (exactMatch) return exactMatch;

        const typeMatchMap = {
            apartment: deals.find((deal) => (deal.propertyType || "").toLowerCase().includes("apartment")),
            villa: deals.find((deal) => (deal.propertyType || "").toLowerCase().includes("villa")),
            rowhouse: deals.find((deal) => (deal.propertyType || "").toLowerCase().includes("rowhouse")),
            plot: deals.find((deal) => (deal.propertyType || "").toLowerCase().includes("plot")),
            shop: deals.find((deal) => (deal.propertyType || "").toLowerCase().includes("shop") || (deal.propertyType || "").toLowerCase().includes("retail")),
        };

        return typeMatchMap[inventoryTypeValue] || deals[0] || null;
    };

    const getProjectStats = (project) => {
        const deals = project.deals || [];
        const toNumber = (value) => Number(String(value || '').replace(/[^0-9.]/g, '')) || 0;
        const formatAmount = (amount) => {
            if (!amount) return "₹0";
            if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(amount % 10000000 === 0 ? 0 : 2)} Cr`;
            if (amount >= 100000) return `₹${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 2)} L`;
            return `₹${amount.toLocaleString("en-IN")}`;
        };

        return {
            totalReceived: formatAmount(deals.reduce((sum, deal) => sum + toNumber(deal.received), 0)),
            upcomingAmount: formatAmount(deals.reduce((sum, deal) => sum + toNumber(deal.pending || deal.nextDueAmount), 0)),
            toBeReleased: formatAmount(deals.reduce((sum, deal) => sum + toNumber(deal.registryAmount), 0)),
        };
    };

    const getProjectImageSource = (project) => {
        const firstImage = project.projectImages?.[0];
        return firstImage?.uri ? { uri: firstImage.uri } : null;
    };
    const projectImageSource = getProjectImageSource(selectedProject);

    const updateInventoryUnit = (target, updater) => {
        const project = projectsData.find(item => item.id === selectedProjectId);
        if (!project) return;

        const inventory = project.inventory || {};
        let nextProject = project;

        if (target.inventoryType === "apartment") {
            nextProject = {
                ...project,
                inventory: {
                    ...inventory,
                    apartment: {
                        ...inventory.apartment,
                        towers: inventory.apartment?.towers?.map((tower) => {
                            if (tower.key !== target.towerKey) return tower;

                            return {
                                ...tower,
                                sections: tower.sections.map((section, sectionIndex) => {
                                    if (sectionIndex !== target.sectionIndex) return section;

                                    return {
                                        ...section,
                                        units: section.units.map((unit, unitIndex) => {
                                            if (unitIndex !== target.unitIndex) return unit;
                                            return updater(unit);
                                        }),
                                    };
                                }),
                            };
                        }),
                    },
                },
            };
        }

        if (target.inventoryType === "villa" || target.inventoryType === "rowhouse" || target.inventoryType === "shop" || target.inventoryType === "showroom") {
            nextProject = {
                ...project,
                inventory: {
                    ...inventory,
                    [target.inventoryType]: {
                        ...inventory[target.inventoryType],
                        sections: inventory[target.inventoryType]?.sections?.map((section, sectionIndex) => {
                            if (sectionIndex !== target.sectionIndex) return section;

                            return {
                                ...section,
                                units: section.units.map((unit, unitIndex) => {
                                    if (unitIndex !== target.unitIndex) return unit;
                                    return updater(unit);
                                }),
                            };
                        }),
                    },
                },
            };
        }

        if (target.inventoryType === "plot") {
            nextProject = {
                ...project,
                inventory: {
                    ...inventory,
                    plot: {
                        ...inventory.plot,
                        stacks: inventory.plot?.stacks?.map((stack) => {
                            if (stack.key !== target.stackKey) return stack;

                            return {
                                ...stack,
                                levels: stack.levels.map((level, levelIndex) => {
                                    if (levelIndex !== target.levelIndex) return level;

                                    return {
                                        ...level,
                                        cards: level.cards.map((card, cardIndex) => {
                                            if (cardIndex !== target.cardIndex) return card;
                                            return updater(card);
                                        }),
                                    };
                                }),
                            };
                        }),
                    },
                },
            };
        }

        dispatch(updateProject(nextProject));
    };

    const openInventoryEdit = (unit, target) => {
        setInventoryEditTarget(target);
        setEditPrice(unit.price || unit.dealValue || unit.amount || "");
        setEditArea(unit.area || "");
        setEditStatus(unit.status || "Available");
        setIsStatusDropdownOpen(false);
        setIsInventoryEditVisible(true);
    };

    const patchInventoryCache = (bpId, realUnitId, price, status) => {
        if (!bpId || !inventoryByProject[bpId]) return;
        const updated = JSON.parse(JSON.stringify(inventoryByProject[bpId]));
        const invType = inventoryEditTarget.inventoryType;
        const typeData = updated[invType];
        if (!typeData) return;

        // Patch a single property in the raw API format
        const patchProp = (p) =>
            p.id === realUnitId
                ? { ...p, price_display: price.trim(), price: price.trim(), status_label: status, status: status.toLowerCase() }
                : p;

        // tower_floor grouping: towers[].floors[].properties[]
        if (typeData.grouping === "tower_floor" && typeData.towers) {
            typeData.towers = typeData.towers.map((t) => ({
                ...t,
                floors: (t.floors || []).map((f) => ({ ...f, properties: (f.properties || []).map(patchProp) })),
            }));
        }
        // range grouping: ranges[].properties[]
        if (typeData.grouping === "range" && typeData.ranges) {
            typeData.ranges = typeData.ranges.map((r) => ({ ...r, properties: (r.properties || []).map(patchProp) }));
        }

        updated[invType] = typeData;
        dispatch(setInventoryData({ projectId: bpId, data: updated }));
    };

    const saveInventoryEdit = async () => {
        if (!inventoryEditTarget) return;

        const realUnitId = inventoryEditTarget._unitId;

        if (realUnitId) {
            const bpId = getBackendProjectId();
            // Optimistic update — patch cache immediately so UI reflects change
            const snapshot = inventoryByProject[bpId] ? JSON.parse(JSON.stringify(inventoryByProject[bpId])) : null;
            patchInventoryCache(bpId, realUnitId, editPrice, editStatus);

            setIsInventoryEditVisible(false);
            setInventoryEditTarget(null);
            setIsStatusDropdownOpen(false);

            try {
                await inventoryService.updateInventoryUnit(realUnitId, {
                    price: editPrice.trim(),
                    status: editStatus,
                });
                dispatch(addNotification({
                    title: "Inventory updated",
                    description: `${inventoryEditTarget.inventoryType} inventory was updated for ${selectedProject.title}.`,
                    type: "inventory",
                }));
            } catch (error) {
                // Roll back optimistic update
                if (snapshot && bpId) dispatch(setInventoryData({ projectId: bpId, data: snapshot }));
                Alert.alert("Update Failed", error.message || "Could not save changes. Please try again.");
            }
        } else {
            // Mock/local data — update Redux project slice
            updateInventoryUnit(inventoryEditTarget, (unit) => ({
                ...unit,
                price: editPrice.trim(),
                area: editArea.trim(),
                status: editStatus,
                dimmed: editStatus === "Sold",
            }));
            dispatch(addNotification({
                title: "Inventory updated",
                description: `${inventoryEditTarget.inventoryType} inventory was updated for ${selectedProject.title}.`,
                type: "inventory",
            }));
            setIsInventoryEditVisible(false);
            setInventoryEditTarget(null);
            setIsStatusDropdownOpen(false);
        }
    };

    const handleTabPress = (tab) => {
        setIsProjectDropdownOpen(false);
        setActiveTab(tab);
    };

    const handleProjectSelect = (projectId) => {
        setSelectedProjectId(projectId);
        setIsProjectDropdownOpen(false);
        setSelectedDeal(null);
        setIsProjectDetailVisible(false);
        // Clear visit data when switching projects
        setVisitStats(null);
        setUpcomingVisits([]);
        // Deals will re-fetch via useEffect when tab is active
        setDeals([]);
    };

    const getPropertyDetailText = (inventoryTypeValue, item) => {
        if (inventoryTypeValue === "plot" || inventoryTypeValue === "shop" || inventoryTypeValue === "showroom") {
            if (inventoryTypeValue === "plot") {
                const metaText = item.meta || item.label || "";
                const areaMatch = metaText.match(/([\d,.]+\s*(?:sq\.?\s*ft\.?|sqft|m2|sqm))/i);
                if (areaMatch) return areaMatch[1].replace(/\s+/g, " ").replace(/sq\.?\s*ft\.?/i, "Sq.Ft");

                const splitParts = metaText.split("•").map((part) => part.trim()).filter(Boolean);
                if (splitParts.length > 1) return splitParts[1];
                if (splitParts.length === 1) return splitParts[0];
            }

            return item.area || item.label || "-";
        }

        const sourceText = item.title || item.label || "";
        const bhkMatch = sourceText.match(/\b\d+\s*BHK\b/i);
        if (bhkMatch) {
            return bhkMatch[0].replace(/\s+/g, " ").toUpperCase();
        }

        return sourceText || "-";
    };

    const getVisitChipStyle = (tone) => {
        switch (tone) {
            case "indigo":
                return "bg-[#E9E8FF] text-[#4A43EC]";
            case "orange":
                return "bg-[#FFF1E3] text-[#F97316]";
            default:
                return "bg-gray-100 text-gray-500";
        }
    };

    const getDealStatusStyle = (tone) => {
        switch (tone) {
            case "success":
                return "bg-[#DDF6E7] text-[#23A55B]";
            case "info":
                return "bg-[#DCEAFF] text-[#4B82F1]";
            case "warning":
                return "bg-[#FDECC8] text-[#D98A1B]";
            case "muted":
                return "bg-[#ECEEF4] text-[#636A78]";
            default:
                return "bg-gray-100 text-gray-500";
        }
    };

    const mapDealStatus = (deal) => {
        const s = (deal.dealStatus || deal.topStatus || "").toLowerCase();
        if ((deal.progress || 0) >= 100 || s.includes("done") || s.includes("completed")) return "Deal completed";
        if (s.includes("install")) return "Installment";
        if (s.includes("token")) return "Tokened";
        return "Visit completed";
    };

    const getDealTone = (mappedStatus) => {
        switch (mappedStatus) {
            case "Deal completed":
                return "success";
            case "Installment":
                return "warning";
            case "Tokened":
                return "info";
            default:
                return "muted";
        }
    };

    // Fetch backend projects and store the mapping
    const fetchBackendProjects = useCallback(async () => {
        try {
            setProjectsLoading(true);
            const res = await projectOverviewApi.getProjectsList();
            const list = res.data?.data || [];
            if (list.length > 0) {
                setBackendProjects(list);
                setProjectsList(list);
                setSelectedProjectId(list[0].id);
                setRealProjectId(list[0].id);
                list.forEach((p) => {
                    dispatch(addProject({
                        id: p.id,
                        title: p.name || p.title,
                        location: [p.location, p.city, p.state].filter(Boolean).join(', '),
                        developer: p.responsible_person_name || p.sales_officer_name || '',
                        possession: p.possession_status || '',
                        rera: !!p.rera_approved,
                        inventory: {},
                        deals: [],
                        visits: { metrics: [], pipeline: { stages: [] }, followUps: [] },
                    }));
                });
                console.log('✅ [HOME] Backend projects fetched:', list.length);
                return list;
            } else {
                console.log('⚠️ [HOME] No projects found');
                return [];
            }
        } catch (error) {
            console.log('❌ [HOME] Failed to fetch backend projects:', error);
            
            // Show user-friendly error message
            const errorMessage = error.userMessage || 
                error.message || 
                'Failed to connect to server. Please ensure the backend is running.';
            
            Alert.alert(
                'Connection Error',
                `${errorMessage}\n\nMake sure:\n• Backend server is running on port 3001\n• Your IP address is correct (192.168.31.143)\n• You're on the same network`,
                [
                    { text: 'Retry', onPress: () => fetchBackendProjects() },
                    { text: 'Continue Offline', style: 'cancel' }
                ]
            );
            return [];
        } finally {
            setProjectsLoading(false);
        }
    }, [dispatch]);

    // Fetch visit data
    const fetchVisitData = useCallback(async (projectId) => {
        if (!projectId) {
            console.log('⚠️ [HOME] No project ID provided, skipping visit fetch');
            return;
        }

        try {
            setVisitsLoading(true);
            console.log('🔵 [HOME] Fetching visit data for project:', projectId);

            const [statsResponse, visitsResponse] = await Promise.all([
                visitService.getVisitStats(projectId),
                visitService.listVisits(projectId, { status: 'all', page: 1, limit: 50 })
            ]);

            if (statsResponse.success) {
                setVisitStats(statsResponse.data);
                console.log('✅ [HOME] Visit stats loaded:', statsResponse.data);
            }

            if (visitsResponse.success) {
                setUpcomingVisits(Array.isArray(visitsResponse.data) ? visitsResponse.data : []);
                console.log('✅ [HOME] Project visits loaded:', visitsResponse.data?.length);
            }
        } catch (error) {
            console.log('❌ [HOME] Failed to fetch visit data:', error);
            // Silently fail — show empty state instead of crashing with Alert
        } finally {
            setVisitsLoading(false);
        }
    }, []);

    // Reload the projects list every time Home regains focus — not just on
    // mount — so a project published via Add Project (which navigates
    // home -> add-project -> success -> home without remounting Home)
    // actually shows up without the user having to restart the app.
    useFocusEffect(
        useCallback(() => {
            fetchBackendProjects();
        }, [fetchBackendProjects])
    );

    // Get the backend project UUID for the currently selected project
    const getBackendProjectId = useCallback(() => {
        console.log('🔍 [HOME] Getting backend project ID...');
        console.log('🔍 [HOME] Selected project ID from Redux:', selectedProjectId);
        console.log('🔍 [HOME] Projects data count:', projectsData.length);
        console.log('🔍 [HOME] Backend projects count:', backendProjects.length);

        // First, check if selectedProjectId is already a valid UUID from backend
        const directMatch = backendProjects.find(bp => bp.id === selectedProjectId);
        if (directMatch) {
            console.log('✅ [HOME] Selected ID is already a backend UUID:', directMatch.name);
            return selectedProjectId;
        }

        // If not, try to find by matching with projectsData
        const selected = projectsData.find(p => p.id === selectedProjectId);
        if (!selected) {
            console.log('⚠️ [HOME] No selected project found in projectsData');

            // Fallback: use first backend project if available
            if (backendProjects.length > 0) {
                console.log('⚠️ [HOME] Using first backend project as fallback:', backendProjects[0].name || backendProjects[0].title);
                return backendProjects[0].id;
            }

            return null;
        }

        console.log('🔍 [HOME] Selected project title:', selected.title);

        // Try to find matching backend project by title or name
        const backendProject = backendProjects.find(bp =>
            bp.name === selected.title ||
            bp.title === selected.title
        );

        if (backendProject) {
            console.log('✅ [HOME] Found matching backend project:', backendProject.name || backendProject.title);
            console.log('✅ [HOME] Backend project UUID:', backendProject.id);
            return backendProject.id;
        } else {
            console.log('⚠️ [HOME] No matching backend project found');
            console.log('⚠️ [HOME] Available backend projects:', backendProjects.map(bp => bp.name || bp.title));

            // Fallback: use first backend project if available
            if (backendProjects.length > 0) {
                console.log('⚠️ [HOME] Using first backend project as fallback:', backendProjects[0].name || backendProjects[0].title);
                return backendProjects[0].id;
            }

            return null;
        }
    }, [selectedProjectId, projectsData, backendProjects]);

    // Load visit data when selected project changes (not just when tab changes)
    useEffect(() => {
        const backendProjectId = getBackendProjectId();
        if (backendProjectId && activeTab === 'Visits') {
            console.log('🔵 [HOME] Selected project ID changed, fetching visit data for:', backendProjectId);
            fetchVisitData(backendProjectId);
        }
    }, [selectedProjectId, activeTab, getBackendProjectId, fetchVisitData]);

    // Also fetch visits when user switches to Visits tab
    useEffect(() => {
        const backendProjectId = getBackendProjectId();
        if (activeTab === 'Visits' && backendProjectId && !visitStats) {
            console.log('🔵 [HOME] Visits tab activated, fetching visit data for:', backendProjectId);
            fetchVisitData(backendProjectId);
        }
    }, [activeTab, getBackendProjectId, fetchVisitData, visitStats]);

    // Pull to refresh handler
    const onRefresh = useCallback(async () => {
        const backendProjectId = getBackendProjectId();
        if (!backendProjectId) return;
        setRefreshing(true);
        if (activeTab === 'Overview') {
            await fetchOverview(backendProjectId);
        } else if (activeTab === 'Inventory') {
            await fetchInventoryData(backendProjectId, true); // force = true to bypass cache
        } else if (activeTab === 'Visits') {
            await fetchVisitData(backendProjectId);
        } else if (activeTab === 'Deals') {
            await fetchDealsData(backendProjectId);
        }
        setRefreshing(false);
    }, [getBackendProjectId, fetchOverview, fetchInventoryData, fetchVisitData, fetchDealsData, activeTab]);

    // Fetch deals data
    const fetchDealsData = useCallback(async (projectId) => {
        if (!projectId) {
            console.log('⚠️ [HOME] No project ID provided, skipping deals fetch');
            return;
        }

        try {
            setDealsLoading(true);
            console.log('🔵 [HOME] Fetching deals for project:', projectId);

            const response = await dealService.getDealsByProjectId(projectId);

            if (response.success) {
                setDeals(response.data || []);
                console.log('✅ [HOME] Deals loaded:', response.data?.length || 0);
            }
        } catch (error) {
            console.log('❌ [HOME] Failed to fetch deals:', error);
            Alert.alert(
                'Error Loading Deals',
                error.message || 'Failed to load deals. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setDealsLoading(false);
        }
    }, []);

    // Load deals when Deals tab is active
    useEffect(() => {
        const backendProjectId = getBackendProjectId();
        if (activeTab === 'Deals' && backendProjectId) {
            fetchDealsData(backendProjectId);
        }
    }, [activeTab, getBackendProjectId, fetchDealsData]);

    // Fetch inventory from real API and normalise into the shape the UI renderers expect
    const fetchInventoryData = useCallback(async (projectId, force = false) => {
        if (!projectId) return;
        // Skip if already cached (unless forced)
        if (!force && inventoryByProject[projectId]) return;
        try {
            dispatch(setInventoryLoading({ projectId }));
            const response = await inventoryService.getProjectInventory(projectId);
            // response.data.inventory = { apartment: {...}, villa: {...}, ... }
            const raw = response?.data?.inventory || {};
            dispatch(setInventoryData({ projectId, data: raw }));
        } catch (error) {
            console.log('❌ [HOME] Failed to fetch inventory:', error);
            dispatch(setInventoryError({ projectId, error: error.message }));
        }
    }, [dispatch, inventoryByProject]);

    // Load inventory when Inventory tab is active
    useEffect(() => {
        const backendProjectId = getBackendProjectId();
        if (activeTab === 'Inventory' && backendProjectId) {
            fetchInventoryData(backendProjectId);
        }
    }, [activeTab, getBackendProjectId, fetchInventoryData]);

    const getRangeLabel = (index, section) => section?.name || section?.label || `Range ${String.fromCharCode(65 + index)}`;

    const getSectionLabel = (index, inventoryTypeValue) => {
        if (inventoryTypeValue === "apartment") return `Floor ${index + 1}`;
        if (inventoryTypeValue === "shop" || inventoryTypeValue === "showroom") return `Section ${index + 1}`;
        return `Range ${String.fromCharCode(65 + index)}`;
    };

    const renderRangeTabs = (groups, activeKey, onSelect) => (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            {groups.map((group) => {
                const isActive = group.key === activeKey;
                return (
                    <TouchableOpacity
                        key={group.key}
                        onPress={() => onSelect(group.key)}
                        className={`px-4 py-2 rounded-full mr-2.5 ${isActive ? "bg-[#3D30F2]" : "bg-white border border-gray-100"}`}
                    >
                        <Text className={`font-lato-bold text-[11px] ${isActive ? "text-white" : "text-gray-500"}`} numberOfLines={1}>
                            {group.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );

    const renderCardGrid = (items, gridKey) => (
        <View className="flex-row flex-wrap">
            {items.map((item, index) => {
                const statusStyle = getBadgeStyle(item.status);
                const isPlot = item.context?.inventoryType === "plot";
                const displayTitle = item.raw.title || (isPlot ? "Plot" : item.raw.meta || item.detail);
                const isRowEnd = (index + 1) % 3 === 0;

                return (
                    <TouchableOpacity
                        key={item.key || `${gridKey}-${index}`}
                        onPress={() => openInventoryDetail(item.raw, item.context)}
                        activeOpacity={0.9}
                        className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-2.5 overflow-hidden"
                        style={{
                            width: "31.5%",
                            marginRight: isRowEnd ? 0 : "2.75%",
                            minHeight: 118,
                            opacity: item.isDimmed ? 0.72 : 1,
                            borderColor: "#E5E7EB",
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.05,
                            shadowRadius: 10,
                            elevation: 2,
                        }}
                    >
                        <View className="p-1.5 flex-1 justify-between">
                            <View className="flex-row items-start justify-between mb-0">
                                <View className="flex-1 pr-2">
                                    <Text className="text-[#9AA3B2] text-[9px] font-lato-bold" numberOfLines={1}>
                                        {item.unitNumber}
                                    </Text>
                                    <Text className="mt-0.5 text-[10px] font-lato text-[#7C8698]" numberOfLines={1}>
                                        {item.detail}
                                    </Text>
                                </View>
                                <View className={`px-1 py-0.5 rounded-full ${statusStyle}`}>
                                    <Text className="text-[7px] font-lato-bold uppercase">{item.status}</Text>
                                </View>
                            </View>

                            <View className="mb-0.5">
                                <Text className="text-[12px] font-lato-bold text-[#1A1A1A]" numberOfLines={1}>
                                    {displayTitle}
                                </Text>
                            </View>

                            <Text className="mt-0.5 text-[9px] font-lato-bold text-[#4A43EC]" numberOfLines={1}>
                                {item.price}
                            </Text>

                            <View className="flex-row items-center justify-end">
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={() => openInventoryEdit(item.raw, { ...item.target, _unitId: item.raw._unitId })}
                                    className="w-8 h-8 rounded-lg bg-gray-100 items-center justify-center"
                                >
                                    <Feather name="edit-3" size={14} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    const EmptyState = ({ message }) => (
        <View className="bg-white rounded-[16px] border border-gray-100 py-10 px-5 items-center">
            <Ionicons name="file-tray-outline" size={24} color="#9CA3AF" />
            <Text className="mt-2 text-gray-400 font-lato text-center">{message}</Text>
        </View>
    );

    const renderInventoryBoxes = () => {
        const inventoryLabel = inventoryTabs.find((tab) => tab.key === inventoryType)?.label || "Inventory";

        if (inventoryType === "apartment") {
            if (!selectedInventory.towers?.length) return <EmptyState message="No apartment inventory available for this project yet." />;

            return (
                <View>
                    <View className="mb-5 rounded-2xl bg-[#E8EDF6] p-1 flex-row">
                        {selectedInventory.towers.map((tower) => {
                            const isActiveTower = selectedTowerData?.key === tower.key;

                            return (
                                <TouchableOpacity
                                    key={tower.key}
                                    onPress={() => setSelectedTower(tower.key)}
                                    className={`flex-1 items-center rounded-[14px] py-2 ${isActiveTower ? "bg-white" : "bg-transparent"}`}
                                    style={{
                                        shadowColor: isActiveTower ? "#000" : "transparent",
                                        shadowOpacity: isActiveTower ? 0.06 : 0,
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowRadius: 4,
                                        elevation: isActiveTower ? 2 : 0,
                                    }}
                                >
                                    <Text className={`text-[12px] font-lato-bold ${isActiveTower ? "text-[#4A43EC]" : "text-[#718096]"}`}>
                                        {tower.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View>
                        {(selectedTowerData?.sections || []).map((section, sectionIndex) => {
                            const sectionLabel = section.rowLabel || `Floor ${sectionIndex + 1}`;
                            const sectionUnits = (section.units || []).map((unit, unitIndex) => ({
                                key: unit.id || `${selectedTowerData?.key}-${sectionLabel}-${unitIndex}`,
                                raw: unit,
                                context: { towerLabel: selectedTowerData?.label, sectionLabel, inventoryLabel, inventoryType },
                                unitNumber: unit.id,
                                detail: getPropertyDetailText(inventoryType, unit),
                                price: unit.price || selectedProject.avgPrice,
                                status: unit.status || "Available",
                                isDimmed: unit.dimmed,
                                target: {
                                    inventoryType: "apartment",
                                    towerKey: selectedTowerData?.key,
                                    sectionIndex,
                                    unitIndex,
                                },
                            }));

                            if (!sectionUnits.length) return (
                                <EmptyState key={`${selectedTowerData?.key}-${sectionLabel}`} message={`No units available in ${sectionLabel}.`} />
                            );

                            return (
                                <View key={`${selectedTowerData?.key}-${sectionLabel}`} className="mb-4">
                                    <View className="mb-2 flex-row items-center justify-between">
                                        <Text className="text-[12px] font-lato-bold text-[#4A43EC]">{sectionLabel}</Text>
                                        <Text className="text-[10px] font-lato text-gray-400">{selectedTowerData?.label}</Text>
                                    </View>
                                    {renderCardGrid(sectionUnits, `${selectedTowerData?.key}-${sectionLabel}`)}
                                </View>
                            );
                        })}
                    </View>
                </View>
            );
        }

        if (inventoryType === "plot") {
            const rangeGroups = (selectedInventory.stacks || []).map((stack, stackIndex) => ({
                key: stack.key || `stack-${stackIndex}`,
                label: getRangeLabel(stackIndex, stack),
                rows: (stack.levels || []).map((level, levelIndex) => ({
                    key: `${stack.key || stackIndex}-${level.level}`,
                    label: `Level ${level.level}`,
                    cards: (level.cards || []).map((card, cardIndex) => ({
                        key: card.unit || `${stack.key}-${level.level}-${cardIndex}`,
                        raw: card,
                        context: { stackLabel: getRangeLabel(stackIndex, stack), sectionLabel: `Level ${level.level}`, inventoryLabel, inventoryType },
                        unitNumber: card.unit,
                        detail: getPropertyDetailText(inventoryType, card),
                        price: card.price || selectedProject.avgPrice,
                        status: card.status || "Available",
                        isDimmed: card.active === false && card.status === "Sold",
                        target: {
                            inventoryType: "plot",
                            stackKey: stack.key,
                            levelIndex,
                            cardIndex,
                        },
                    })),
                })),
            }));

            if (!rangeGroups.length) return <EmptyState message="No plot inventory available for this project yet." />;
            const activeRangeKey = rangeGroups.some(group => group.key === selectedPlotStack) ? selectedPlotStack : rangeGroups[0].key;
            const activeRangeGroup = rangeGroups.find(group => group.key === activeRangeKey) || rangeGroups[0];

            return (
                <View>
                    {renderRangeTabs(rangeGroups, activeRangeKey, setSelectedPlotStack)}
                    <View className="mb-4">
                        <View className="mb-2 flex-row items-center justify-between">
                            <Text className="text-[12px] font-lato-bold text-[#4A43EC]">{activeRangeGroup.label}</Text>
                            <Text className="text-[10px] font-lato text-gray-400">Range Wise</Text>
                        </View>
                        {(() => {
                            const plotCards = activeRangeGroup.rows.flatMap(row => row.cards);
                            return plotCards.length
                                ? renderCardGrid(plotCards, activeRangeGroup.key)
                                : <EmptyState message={`No plots available in ${activeRangeGroup.label}.`} />;
                        })()}
                    </View>
                </View>
            );
        }

        const sectionGroups = (selectedInventory.sections || []).map((section, sectionIndex) => {
            const sectionLabel = getSectionLabel(sectionIndex, inventoryType);
            return {
                key: section.id || `${inventoryType}-${sectionIndex}`,
                label: sectionLabel,
                units: (section.units || []).map((unit, unitIndex) => ({
                    key: unit.id || `${sectionLabel}-${unitIndex}`,
                    raw: unit,
                    context: { towerLabel: selectedTowerData?.label, sectionLabel, inventoryLabel, inventoryType },
                    unitNumber: unit.id,
                    detail: getPropertyDetailText(inventoryType, unit),
                    price: unit.price || selectedProject.avgPrice,
                    status: unit.status || "Available",
                    isDimmed: unit.dimmed,
                    target: {
                        inventoryType,
                        sectionIndex,
                        unitIndex,
                    },
                })),
            };
        });

        if (!sectionGroups.length) return <EmptyState message={`No ${inventoryLabel.toLowerCase()} inventory available for this project yet.`} />;

        if (inventoryType === "villa" || inventoryType === "rowhouse") {
            const activeSectionKey = sectionGroups.some(group => group.key === selectedRangeByType[inventoryType])
                ? selectedRangeByType[inventoryType]
                : sectionGroups[0].key;
            const activeSectionGroup = sectionGroups.find(group => group.key === activeSectionKey) || sectionGroups[0];

            return (
                <View>
                    {renderRangeTabs(sectionGroups, activeSectionKey, (key) => setSelectedRangeByType(prev => ({ ...prev, [inventoryType]: key })))}
                    <View className="mb-4">
                        <View className="mb-2 flex-row items-center justify-between">
                            <Text className="text-[12px] font-lato-bold text-[#4A43EC]">{activeSectionGroup.label}</Text>
                            <Text className="text-[10px] font-lato text-gray-400">Range Wise</Text>
                        </View>
                        {activeSectionGroup.units.length ? renderCardGrid(activeSectionGroup.units, activeSectionGroup.key) : <EmptyState message={`No units available in ${activeSectionGroup.label}.`} />}
                    </View>
                </View>
            );
        }

        return (
            <View>
                {sectionGroups.map((sectionGroup) => (
                    <View key={sectionGroup.key} className="mb-4">
                        <View className="mb-2 flex-row items-center justify-between">
                            <Text className="text-[12px] font-lato-bold text-[#4A43EC]">{sectionGroup.label}</Text>
                            <Text className="text-[10px] font-lato text-gray-400">
                                {inventoryType === "shop" || inventoryType === "showroom" ? "Section Wise" : "Range Wise"}
                            </Text>
                        </View>
                        {sectionGroup.units.length ? renderCardGrid(sectionGroup.units, sectionGroup.key) : <EmptyState message={`No units available in ${sectionGroup.label}.`} />}
                    </View>
                ))}
            </View>
        );
    };

    const openInventoryDetail = async (unit, context = {}) => {
        const sectionLabel = context.sectionLabel || context.towerLabel || context.stackLabel || selectedProject.title;
        const unitLabel = unit.id || unit.unit || unit.title || "Property";

        // If we have a real backend unit UUID, fetch full details
        const realUnitId = unit._unitId;
        if (realUnitId) {
            try {
                setUnitDetailLoading(true);
                const response = await inventoryService.getInventoryUnitDetails(realUnitId);
                const details = response?.data;
                if (details) {
                    const u = details.unit || {};
                    const proj = details.project || {};
                    const dealSummary = details.deal_summary;
                    const isBooked = !!dealSummary;

                    setSelectedDeal({
                        // unit fields
                        id: u.id,
                        _unitId: u.id,
                        inventory_unit_id: u.id,
                        unit_code: u.unit_code,
                        title: `${sectionLabel} • ${u.display_title || u.unit_code || unitLabel}`,
                        propertyType: u.configuration || u.title || context.inventoryLabel || "Property",
                        price: u.price_display,
                        priceRange: u.price_display,
                        area: details.area,
                        area_sqft: details.area_sqft,
                        possession: details.possession,
                        possession_date: details.possession_date,
                        possession_status: details.possession_status,
                        mobile: details.mobile,
                        location: details.location,
                        // project fields
                        project_name: proj.name,
                        avg_price_per_sqft: proj.avg_price_per_sqft,
                        avgPricePerSqft: proj.avg_price_per_sqft_display,
                        development_progress: proj.development_progress,
                        is_verified: proj.is_verified,
                        // deal fields
                        ...(dealSummary || {}),
                        deal_id: dealSummary?.id,
                        dealId: dealSummary?.id,
                        deal_summary: dealSummary,
                        // media / amenities
                        images: (details.media || []).filter(m => m.media_type === 'image').map(m => ({ uri: m.url })),
                        amenities: (details.amenities || []).map(a => a.name),
                        // modal flags
                        topStatus: u.status_label || u.status,
                        dealStatus: u.status,
                        footerStatus: isBooked ? dealSummary.status_label : u.status_label,
                        progress: dealSummary?.payment_progress_percent ?? 0,
                        showDealSummary: isBooked,
                        showFollowUps: !isBooked,
                        // payment schedule
                        payment_schedule: dealSummary?.payment_schedule || [],
                        payment_progress_percent: dealSummary?.payment_progress_percent ?? 0,
                    });
                    setIsProjectDetailVisible(true);
                    return;
                }
            } catch (err) {
                console.log('❌ [HOME] getInventoryUnitDetails failed, falling back:', err);
            } finally {
                setUnitDetailLoading(false);
            }
        }

        // Fallback: _unitId missing or API failed — show what we have from the unit itself
        const isBookedOrSoldUnit = unit.status === "Booked" || unit.status === "Sold";

        setSelectedDeal({
            ...unit,
            inventory_unit_id: unit.id || unit.unit,
            title: `${sectionLabel} • ${unitLabel}`,
            propertyType: unit.title || unit.meta || context.inventoryLabel || "Property",
            topStatus: unit.status,
            dealStatus: unit.status,
            area: unit.area || unit.area_sqft || null,
            possession: unit.possession || null,
            avgPricePerSqft: unit.avgPricePerSqft || null,
            amenities: unit.amenities || [],
            images: unit.images || [],
            progress: unit.progress ?? 0,
            showDealSummary: isBookedOrSoldUnit,
            showFollowUps: false,
        });
        setIsProjectDetailVisible(true);
    };

    const handleDealVariantUpdate = (updatedDeal) => {
        setSelectedDeal(updatedDeal);

        const project = projectsData.find(item => item.id === selectedProjectId);
        if (!project || !Array.isArray(project.deals)) return;

        dispatch(updateProject({
            ...project,
            deals: project.deals.map((deal) => {
                const sameDeal =
                    deal.title === updatedDeal?.title &&
                    deal.bookedBy === updatedDeal?.bookedBy &&
                    deal.mobile === updatedDeal?.mobile;

                return sameDeal ? { ...deal, ...updatedDeal } : deal;
            }),
        }));
    };

    // Only ever derive the dropdown from the real, currently-fetched project list
    // (projectsList, from the API). projectsData (the Redux `projects` slice) is
    // never reset on logout, so falling back to it here could show a previous
    // account's projects to a developer who genuinely has none.
    const projectOptions = projectsList.map(p => ({
        id: p.id,
        title: p.name,
        location: p.city,
        status: p.status,
        approvalStatus: p.overall_approval_status,
        leadStage: p.lead_stage,
        onboardingProgress: p.onboarding_progress,
    }));
    const hasProjects = projectOptions.length > 0;

    // Merge API overview into the shape the UI expects
    const apiHeader = overviewData?.header;
    const apiInventory = overviewData?.inventory;
    const apiFinancials = overviewData?.financials;
    const apiUserProfile = overviewData?.user_profile;
    const apiMedia = overviewData?.media || [];
    const apiConfigurations = overviewData?.configurations || [];
    const apiPipeline = overviewData?.pipeline;

    const formatAmount = (amount) => {
        if (!amount) return "₹0";
        if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
        return `₹${Number(amount).toLocaleString("en-IN")}`;
    };

    const projectStats = apiFinancials ? {
        totalReceived: formatAmount(apiFinancials.total_received),
        upcomingAmount: formatAmount(apiFinancials.upcoming_amount),
        toBeReleased: formatAmount(apiFinancials.to_be_released),
    } : getProjectStats(selectedProject);

    const authUserName = [authUser?.first_name, authUser?.last_name].filter(Boolean).join(' ');
    const displayUserName = apiUserProfile?.name || authUserName || "Welcome";
    const displayUserDate = apiUserProfile?.date_display || new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const displayUserAvatar = apiUserProfile?.avatar_url || authUser?.avatar_url || null;
    const displayUserVerified = apiUserProfile?.is_verified ?? isKycCompleted;

    const displayProjectTitle = apiHeader?.name || selectedProject?.title || "Select Project";
    const displayProjectLocation = apiHeader?.location || selectedProject?.location || "";
    const displayPossession = (() => {
        const raw = apiHeader?.possession_by || selectedProject?.possession || "";
        if (!raw) return "";
        // If it looks like a raw ISO date (YYYY-MM-DD), format it
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
            return new Date(raw).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        }
        return raw;
    })();
    const displayAvgPrice = apiHeader?.avg_price_per_sqft ? `₹${apiHeader.avg_price_per_sqft}/sqft` : selectedProject?.avgPrice || "";
    const displayReraApproved = apiHeader?.rera?.is_approved ?? apiHeader?.rera_approved ?? selectedProject?.rera ?? false;
    const displayReraNumber = apiHeader?.rera?.number || apiHeader?.rera_number || "";

    const displayUnits = apiInventory ? {
        total: apiInventory.total,
        avail: apiInventory.available,
        sold: apiInventory.sold,
        booked: apiInventory.booked,
    } : selectedProject?.units || {};

    // Map API configurations to apartments display shape
    const displayApartments = apiConfigurations.length > 0
        ? apiConfigurations.map(c => ({
            type: c.type,
            price: c.min_price === c.max_price
                ? formatAmount(c.min_price)
                : `${formatAmount(c.min_price)} - ${formatAmount(c.max_price)}`,
        }))
        : selectedProject?.apartments || [];

    // Cover image from API media or fallback to Redux
    const displayCoverImage = apiMedia.length > 0 ? { uri: apiMedia[0] } : getProjectImageSource(selectedProject);
    const lightboxImages = apiMedia.length > 0 ? apiMedia : (displayCoverImage ? [displayCoverImage.uri] : []);

    // ── Inventory from real API (falls back to Redux mock when not yet loaded) ──
    const backendProjectId = getBackendProjectId();
    const apiInventoryRaw = inventoryByProject[backendProjectId] || null;
    const isInventoryLoading = inventoryLoading[backendProjectId] ?? false;

    // Convert API range-based grouping { ranges: [{range_name, properties}] }
    // into the sections shape the existing renderers already understand
    const toSectionsShape = (apiType) => {
        if (!apiType) return { sections: [] };
        if (apiType.grouping === 'range') {
            return {
                sections: (apiType.ranges || []).map((r) => ({
                    id: r.range_name,
                    name: r.range_name,
                    units: (r.properties || []).map((p) => ({
                        id: p.unit_code || p.id,
                        title: p.display_title || p.title,
                        area: p.area,
                        area_sqft: p.area_sqft,
                        price: p.price_display || p.price,
                        status: p.status_label || p.status,
                        configuration: p.configuration,
                        _unitId: p.id, // real UUID for unit detail API
                    })),
                })),
                summary: apiType.summary,
            };
        }
        if (apiType.grouping === 'tower_floor') {
            return {
                towers: (apiType.towers || []).map((t) => ({
                    key: t.tower_name,
                    label: t.tower_name,
                    sections: (t.floors || []).map((f) => ({
                        id: f.floor_name,
                        rowLabel: f.floor_name,
                        units: (f.properties || []).map((p) => ({
                            id: p.unit_code || p.id,
                            title: p.display_title || p.title,
                            area: p.area,
                            area_sqft: p.area_sqft,
                            price: p.price_display || p.price,
                            status: p.status_label || p.status,
                            configuration: p.configuration,
                            _unitId: p.id, // real UUID for unit detail API
                        })),
                    })),
                })),
                summary: apiType.summary,
            };
        }
        return { sections: [] };
    };

    // Build the inventory object the renderers consume, preferring API data
    const resolvedInventory = useMemo(() => {
        if (apiInventoryRaw) {
            const result = {};
            Object.keys(apiInventoryRaw).forEach((type) => {
                result[type] = toSectionsShape(apiInventoryRaw[type]);
            });
            return result;
        }
        // Fallback to Redux mock data
        return selectedProject.inventory || {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiInventoryRaw, selectedProject.inventory]);

    const availableInventoryTabs = useMemo(() => inventoryTabs.filter((tab) => {
        const inv = resolvedInventory[tab.key];
        return Boolean(
            inv?.towers?.length ||
            inv?.sections?.length ||
            inv?.stacks?.length
        );
    }), [inventoryTabs, resolvedInventory]);

    const availableInventoryKeys = availableInventoryTabs.map(tab => tab.key).join('|');
    const selectedInventory = resolvedInventory[inventoryType] || { sections: [] };
    const selectedTowerData = selectedInventory.towers?.find((tower) => tower.key === selectedTower) || selectedInventory.towers?.[0] || null;
    const selectedPlotData = selectedInventory.stacks?.find((stack) => stack.key === selectedPlotStack) || selectedInventory.stacks?.[0] || null;
    const activePlotUnit = selectedPlotData?.levels.flatMap((level) => level.cards || []).find((card) => card.unit === selectedPlotUnit)
        || selectedPlotData?.levels.flatMap((level) => level.cards || []).find((card) => card.active)
        || selectedPlotData?.levels.flatMap((level) => level.cards || []).find((card) => card.unit)
        || null;

    useEffect(() => {
        if (availableInventoryTabs.length && !availableInventoryTabs.some(tab => tab.key === inventoryType)) {
            setInventoryType(availableInventoryTabs[0].key);
        }
    }, [availableInventoryKeys, availableInventoryTabs, inventoryType]);

    useEffect(() => {
        if (inventoryType === "apartment") {
            const firstTowerKey = selectedInventory.towers?.[0]?.key;
            if (firstTowerKey) setSelectedTower(firstTowerKey);
        }
        if (inventoryType === "plot") {
            const firstStackKey = selectedInventory.stacks?.[0]?.key;
            if (firstStackKey) setSelectedPlotStack(firstStackKey);
        }
    }, [inventoryType, selectedInventory.towers, selectedInventory.stacks]);

    useEffect(() => {
        if (inventoryType !== "plot") return;
        if (!activePlotUnit?.unit) return;
        setSelectedPlotUnit(activePlotUnit.unit);
    }, [inventoryType, selectedPlotData, activePlotUnit]);

    useEffect(() => {
        if (!isInventoryEditVisible) return;

        if (!inventoryEditTarget) return;

        const latestProject = projectsData.find((project) => project.id === selectedProjectId) || projectsData[0];
        if (!latestProject) return;

        const latestInventory = latestProject.inventory?.[inventoryEditTarget.inventoryType];
        if (!latestInventory) return;

        let targetUnit = null;

        if (inventoryEditTarget.inventoryType === "apartment") {
            targetUnit = latestInventory.towers?.find((tower) => tower.key === inventoryEditTarget.towerKey)
                ?.sections?.[inventoryEditTarget.sectionIndex]?.units?.[inventoryEditTarget.unitIndex] || null;
        } else if (inventoryEditTarget.inventoryType === "villa" || inventoryEditTarget.inventoryType === "rowhouse" || inventoryEditTarget.inventoryType === "shop") {
            targetUnit = latestInventory.sections?.[inventoryEditTarget.sectionIndex]?.units?.[inventoryEditTarget.unitIndex] || null;
        } else if (inventoryEditTarget.inventoryType === "plot") {
            targetUnit = latestInventory.stacks?.find((stack) => stack.key === inventoryEditTarget.stackKey)
                ?.levels?.[inventoryEditTarget.levelIndex]?.cards?.[inventoryEditTarget.cardIndex] || null;
        }

        if (targetUnit) {
            setEditPrice(targetUnit.price || targetUnit.dealValue || targetUnit.amount || "");
            setEditArea(targetUnit.area || "");
        }
    }, [isInventoryEditVisible, inventoryEditTarget, projectsData, selectedProjectId]);

    useEffect(() => {
        Animated.timing(headerAnimation, {
            toValue: activeTab === "Overview" ? 1 : 0,
            duration: 280,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [activeTab, headerAnimation]);

    return (
        <View className="flex-1 bg-white">
            <StatusBar style={activeTab === "Overview" ? "light" : "dark"} translucent backgroundColor="transparent" />
            <Modal
                visible={isProjectDropdownOpen && hasProjects}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setIsProjectDropdownOpen(false)}
            >
                <View style={{ flex: 1, zIndex: DROPDOWN_LAYER, elevation: DROPDOWN_LAYER }}>
                    {/* Backdrop */}
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => setIsProjectDropdownOpen(false)}
                        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                    />
                    {/* Dropdown list */}
                    <View
                        className="bg-white rounded-xl border overflow-hidden"
                        style={{
                            marginTop: activeTab === "Overview" ? Math.max(insets.top, 20) + 104 : Math.max(insets.top, 20) + 58,
                            marginHorizontal: activeTab === "Overview" ? 20 : 64,
                            maxHeight: 280,
                            borderWidth: 1.5,
                            borderColor: "#4A43EC",
                            zIndex: DROPDOWN_LAYER,
                            elevation: DROPDOWN_LAYER,
                        }}
                    >
                        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {projectOptions.map((project) => {
                                const isSelected = project.id === selectedProjectId;
                                const stageKey = project.leadStage || (project.status === "active" ? "project_live" : "new_lead");
                                const meta = PIPELINE_STAGE_META[stageKey] || PIPELINE_STAGE_META.new_lead;

                                return (
                                    <TouchableOpacity
                                        key={project.id}
                                        activeOpacity={0.85}
                                        onPress={() => handleProjectSelect(project.id)}
                                        className={`px-3 py-3 ${isSelected ? "bg-[#F4F3FF]" : "bg-white"}`}
                                    >
                                        <View className="flex-row items-center justify-between">
                                            <Text className={`font-lato-bold text-[12px] flex-1 mr-2 ${isSelected ? "text-[#4A43EC]" : "text-[#1A1A1A]"}`} numberOfLines={1}>
                                                {project.title}
                                            </Text>
                                            <View
                                                style={{
                                                    backgroundColor: meta.badgeBg,
                                                    borderColor: meta.badgeBorder,
                                                    borderWidth: 1,
                                                    paddingHorizontal: 6,
                                                    paddingVertical: 1.5,
                                                    borderRadius: 99,
                                                }}
                                            >
                                                <Text style={{ fontSize: 9, fontFamily: "Lato-Bold", color: meta.badgeText, fontWeight: "700" }}>
                                                    {meta.label}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text className="mt-0.5 text-[10px] font-lato text-[#8E9AAF]" numberOfLines={1}>
                                            {project.location || "Location pending"}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Header Switcher */}
            <Animated.View
                style={{
                    height: animatedHeaderHeight,
                    overflow: isProjectDropdownOpen || activeTab !== "Overview" ? "visible" : "hidden",
                    position: "relative",
                    zIndex: isProjectDropdownOpen ? DROPDOWN_LAYER : 1,
                    elevation: isProjectDropdownOpen ? DROPDOWN_LAYER : 1,
                }}
            >
                <Animated.View
                    pointerEvents={activeTab === "Overview" ? "auto" : "none"}
                    style={{
                        opacity: headerAnimation,
                        transform: [{ translateY: overviewHeaderTranslateY }],
                    }}
                >
                    <View style={{ position: "relative" }}>
                        <LinearGradient
                            colors={["#5D57F3", "#4A43EC"]}
                            className="rounded-b-[35px]"
                            style={{
                                paddingTop: Math.max(insets.top, 20) + 7,
                                paddingHorizontal: 20,
                                paddingBottom: 40,
                                overflow: "visible"
                            }}
                        >
                            {/* Profile & Notification */}
                            <View className="flex-row justify-between items-center mb-4">
                                <View className="flex-row items-center">
                                    <TouchableOpacity 
                                        activeOpacity={0.85}
                                        onPress={() => router.push("/(tabs)/settings")}
                                        className="w-[46px] h-[46px] relative"
                                    >
                                        <Avatar
                                            uri={displayUserAvatar}
                                            name={displayUserName}
                                            className="w-[50px] h-[50px] rounded-full border-2 border-white bg-white/20"
                                            textClassName="text-white text-lg font-lato-bold"
                                        />
                                    </TouchableOpacity>
                                    <View className="ml-3">
                                        <View className="flex-row items-center">
                                            {overviewLoading ? (
                                                <SkeletonBox width={110} height={13} borderRadius={6} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
                                            ) : (
                                                <>
                                                    <Text className="text-white text-[15px] font-lato-bold">{displayUserName}</Text>
                                                    {displayUserVerified && (
                                                        <MaterialIcons name="verified" size={14} color="#4ADE80" style={{ marginLeft: 4 }} />
                                                    )}
                                                </>
                                            )}
                                        </View>
                                        {overviewLoading ? (
                                            <SkeletonBox width={70} height={8} borderRadius={4} style={{ marginTop: 4, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                                        ) : (
                                            <Text className="text-white/70 text-[9px] font-lato">{displayUserDate}</Text>
                                        )}
                                    </View>
                                </View>
                                <TouchableOpacity
                                    className="w-8 h-8 rounded-full bg-white/10 items-center justify-center relative"
                                    onPress={() => router.push("/(screens)/notifications")}
                                >
                                    <Ionicons name="notifications-outline" size={18} color="white" />
                                    {unreadNotifications > 0 && (
                                        <View className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 items-center justify-center px-1">
                                            <Text className="text-[8px] font-lato-bold text-white">
                                                {unreadNotifications > 9 ? "9+" : unreadNotifications}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* Search & Add Project */}
                            <View className="flex-row items-center gap-2.5 mb-4" style={{ zIndex: 1000, elevation: 1000, position: "relative" }}>
                                <View className="flex-1 relative z-50" style={{ zIndex: DROPDOWN_LAYER, elevation: DROPDOWN_LAYER }}>
                                    <TouchableOpacity
                                        activeOpacity={hasProjects ? 0.85 : 1}
                                        onPress={() => hasProjects && setIsProjectDropdownOpen((current) => !current)}
                                        className="h-9 bg-white rounded-xl flex-row items-center px-3"
                                    >
                                        {hasProjects && <Ionicons name="chevron-down" size={16} color="#4A43EC" />}
                                        <Text className={`flex-1 ${hasProjects ? 'ml-2' : ''} text-[#1A1A1A] font-lato text-[12px]`} numberOfLines={1}>
                                            {overviewLoading
                                                ? <SkeletonBox width={120} height={10} borderRadius={5} />
                                                : (hasProjects ? displayProjectTitle : "No projects yet")
                                            }
                                        </Text>
                                    </TouchableOpacity>


                                </View>
                                <TouchableOpacity
                                    className="h-9 px-3 rounded-xl flex-row items-center border border-white/50"
                                    onPress={() => router.push("/add-project")}
                                >
                                    <View className="w-[18px] h-[18px] rounded-full bg-white items-center justify-center">
                                        <Ionicons name="add" size={14} color="#4A43EC" />
                                    </View>
                                    <Text className="text-white ml-2 font-lato-bold text-[11px]">Add Projects</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Stats Cards */}
                            <View className="flex-row justify-between" style={{ zIndex: 1, elevation: 1, position: "relative" }}>
                                {overviewLoading ? (
                                    <>
                                        {[0, 1, 2].map((i) => (
                                            <View key={i} className={`flex-1 bg-white/15 rounded-2xl overflow-hidden ${i < 2 ? "mr-2" : ""} min-h-[72px]`}>
                                                <View className="bg-white/20 py-2.5 items-center">
                                                    <SkeletonBox width={64} height={8} borderRadius={4} style={{ backgroundColor: "rgba(255,255,255,0.3)" }} />
                                                </View>
                                                <View className="py-3 items-center">
                                                    <SkeletonBox width={56} height={14} borderRadius={5} style={{ backgroundColor: "rgba(255,255,255,0.25)" }} />
                                                </View>
                                            </View>
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        <View className="flex-1 bg-white rounded-2xl overflow-hidden shadow-sm mr-2 border border-white/50 min-h-[72px]">
                                            <View className="bg-[#4A43EC] py-2.5 items-center">
                                                <Text className="text-white text-[9px] font-lato-bold uppercase tracking-tighter">Total Received</Text>
                                            </View>
                                            <View className="py-3 items-center bg-white">
                                                <Text className="text-[#1A1A1A] text-[13px] font-lato-bold">{projectStats.totalReceived}</Text>
                                            </View>
                                        </View>

                                        <View className="flex-1 bg-white rounded-2xl overflow-hidden shadow-sm mr-2 border border-white/50 min-h-[72px]">
                                            <View className="bg-[#4A43EC] py-2.5 items-center">
                                                <Text className="text-white text-[9px] font-lato-bold uppercase tracking-tighter">Upcoming  Amount</Text>
                                            </View>
                                            <View className="py-3 items-center bg-white">
                                                <Text className="text-[#10B981] text-[13px] font-lato-bold">{projectStats.upcomingAmount}</Text>
                                            </View>
                                        </View>

                                        <View className="flex-1 bg-white rounded-2xl overflow-hidden shadow-sm border border-white/50 min-h-[72px]">
                                            <View className="bg-[#4A43EC] py-2.5 items-center">
                                                <Text className="text-white text-[9px] font-lato-bold uppercase tracking-tighter">To Be Released</Text>
                                            </View>
                                            <View className="py-3 items-center bg-white">
                                                <Text className="text-[#EF4444] text-[13px] font-lato-bold">{projectStats.toBeReleased}</Text>
                                            </View>
                                        </View>
                                    </>
                                )}
                            </View>
                        </LinearGradient>

                        {/* 20-stop smooth fade overlay */}
                        <LinearGradient
                            colors={[
                                "transparent",
                                "rgba(255,255,255,0.01)",
                                "rgba(255,255,255,0.03)",
                                "rgba(255,255,255,0.06)",
                                "rgba(255,255,255,0.10)",
                                "rgba(255,255,255,0.15)",
                                "rgba(255,255,255,0.21)",
                                "rgba(255,255,255,0.28)",
                                "rgba(255,255,255,0.36)",
                                "rgba(255,255,255,0.44)",
                                "rgba(255,255,255,0.52)",
                                "rgba(255,255,255,0.60)",
                                "rgba(255,255,255,0.68)",
                                "rgba(255,255,255,0.75)",
                                "rgba(255,255,255,0.82)",
                                "rgba(255,255,255,0.88)",
                                "rgba(255,255,255,0.93)",
                                "rgba(255,255,255,0.97)",
                                "rgba(255,255,255,0.99)",
                                "white"
                            ]}
                            style={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: 100,
                            }}
                            pointerEvents="none"
                        />
                    </View>
                </Animated.View>

                <Animated.View
                    pointerEvents={activeTab === "Overview" ? "none" : "auto"}
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: 0,
                        opacity: compactHeaderOpacity,
                        transform: [{ translateY: compactHeaderTranslateY }],
                        zIndex: isProjectDropdownOpen ? DROPDOWN_LAYER : 10,
                        elevation: isProjectDropdownOpen ? DROPDOWN_LAYER : 10,
                    }}
                >
                    <View
                        style={{
                            paddingTop: Math.max(insets.top, 20) + 10,
                            position: "relative",
                            zIndex: isProjectDropdownOpen ? DROPDOWN_LAYER : 10,
                            elevation: isProjectDropdownOpen ? DROPDOWN_LAYER : 10,
                        }}
                        className="bg-white px-5 pb-4"
                    >
                        <View className="flex-row items-center justify-between">
                            <TouchableOpacity
                                onPress={() => setActiveTab("Overview")}
                                className="w-10 h-10 rounded-full border border-gray-100 items-center justify-center"
                            >
                                <Ionicons name="chevron-back" size={20} color="#1A1A1A" />
                            </TouchableOpacity>
                            <View className="relative flex-1 mx-3 items-center" style={{ zIndex: DROPDOWN_LAYER, elevation: DROPDOWN_LAYER }}>
                                <TouchableOpacity
                                    activeOpacity={hasProjects ? 0.85 : 1}
                                    onPress={() => hasProjects && setIsProjectDropdownOpen((current) => !current)}
                                    className="flex-row items-center max-w-full"
                                >
                                    <Text className="text-[#1A1A1A] text-lg font-lato-bold mr-1" numberOfLines={1}>
                                        {overviewLoading
                                            ? <SkeletonBox width={140} height={14} borderRadius={6} />
                                            : (hasProjects ? displayProjectTitle : "No projects yet")
                                        }
                                    </Text>
                                    {hasProjects && (
                                        <Ionicons name={isProjectDropdownOpen ? "chevron-up" : "chevron-down"} size={16} color="#1A1A1A" />
                                    )}
                                </TouchableOpacity>


                            </View>
                            <View className="w-10" />
                        </View>
                    </View>
                </Animated.View>
            </Animated.View>

            {/* Tabs Bar */}
            {hasProjects && (
                <View className="flex-row justify-around border-b border-gray-100 bg-white" style={{ paddingHorizontal: 10, zIndex: 0, elevation: 0 }}>
                    {tabs.map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => handleTabPress(tab)}
                            className={`pb-2 px-1.5 ${activeTab === tab ? "border-b-2 border-[#4A43EC]" : ""}`}
                        >
                            <Text className={`${activeTab === tab ? "text-[#4A43EC] font-lato-bold" : "text-gray-400 font-lato"} text-[11px]`}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                alwaysBounceVertical={true}
                contentContainerStyle={{ paddingBottom: 120 }}
                refreshControl={
                    (activeTab === 'Overview' || activeTab === 'Inventory') ? (
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#4A43EC']}
                            tintColor="#4A43EC"
                        />
                    ) : undefined
                }
            >
                {activeTab === "Overview" ? (
                    <View className="pt-2">
                        {!hasProjects ? (
                            <View className="mx-5 my-4 bg-white rounded-[20px] border border-gray-100 items-center justify-center py-12 px-6">
                                <View className="w-14 h-14 rounded-full bg-[#EEF0FF] items-center justify-center">
                                    <Ionicons name="business-outline" size={26} color="#4A43EC" />
                                </View>
                                <Text className="mt-4 text-[14px] font-lato-bold text-gray-700 text-center">No projects yet</Text>
                                <Text className="mt-1 text-[11.5px] font-lato text-gray-400 text-center leading-5">Add your first project to see its overview here.</Text>
                                <TouchableOpacity
                                    onPress={() => router.push("/add-project")}
                                    className="mt-5 bg-[#4A43EC] rounded-xl px-6 py-2.5"
                                >
                                    <Text className="text-white text-[12px] font-lato-bold">Add Project</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                        <View key={selectedProject.id} className="mx-5 my-4 bg-white rounded-[20px] border border-gray-200 shadow-sm overflow-hidden">
                            {overviewLoading ? (
                                <>
                                    {/* Image skeleton */}
                                    <View className="flex-row h-36">
                                        <View className="flex-[2]">
                                            <SkeletonBox width="100%" height={144} borderRadius={0} />
                                        </View>
                                        <View className="flex-1 ml-0.5">
                                            <SkeletonBox width="100%" height={144} borderRadius={0} style={{ opacity: 0.5 }} />
                                        </View>
                                    </View>
                                    {/* Content skeleton */}
                                    <View className="p-3 gap-3">
                                        {/* possession + avg price row */}
                                        <View className="flex-row items-center gap-2">
                                            <SkeletonBox width={90} height={9} borderRadius={4} />
                                            <SkeletonBox width={4} height={4} borderRadius={2} />
                                            <SkeletonBox width={120} height={9} borderRadius={4} />
                                        </View>
                                        {/* project title */}
                                        <SkeletonBox width="65%" height={20} borderRadius={6} />
                                        {/* location */}
                                        <SkeletonBox width="42%" height={10} borderRadius={5} />
                                        {/* divider + apartment configs */}
                                        <View className="border-t border-dashed border-gray-100 pt-3 flex-row gap-4">
                                            <View className="flex-1 gap-1.5">
                                                <SkeletonBox width={40} height={9} borderRadius={4} />
                                                <SkeletonBox width={80} height={14} borderRadius={5} />
                                            </View>
                                            <View className="w-px bg-gray-100" />
                                            <View className="flex-1 gap-1.5">
                                                <SkeletonBox width={40} height={9} borderRadius={4} />
                                                <SkeletonBox width={80} height={14} borderRadius={5} />
                                            </View>
                                        </View>
                                        {/* unit count pills */}
                                        <View className="flex-row gap-2 mt-1">
                                            {["Total", "Avail", "Sold", "Booked"].map((label) => (
                                                <View key={label} className="flex-1 rounded-lg py-1.5 items-center gap-1.5" style={{ backgroundColor: "#F8FAFC" }}>
                                                    <SkeletonBox width={26} height={8} borderRadius={3} />
                                                    <SkeletonBox width={22} height={13} borderRadius={4} />
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                </>
                            ) : (
                                <>
                                <TouchableOpacity
                                    activeOpacity={displayCoverImage ? 0.9 : 1}
                                    disabled={!displayCoverImage}
                                    onPress={() => setIsImageLightboxVisible(true)}
                                    className="h-36 relative"
                                >
                                    {displayCoverImage ? (
                                        <Image source={displayCoverImage} className="w-full h-full" resizeMode="cover" />
                                    ) : (
                                        <View className="w-full h-full bg-[#F4F7FF] items-center justify-center px-4">
                                            <Ionicons name="image-outline" size={26} color="#9CA3AF" />
                                            <Text className="mt-2 text-[11px] font-lato-bold text-gray-400 text-center">No images available</Text>
                                        </View>
                                    )}
                                    {displayCoverImage && (
                                        <View className="absolute top-2 left-2 bg-black/40 px-2 py-0.5 rounded-md">
                                            <Text className="text-white text-[8px] font-lato">{selectedProject.developer}</Text>
                                        </View>
                                    )}
                                    {apiMedia.length > 1 && (
                                        <View className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded-md flex-row items-center">
                                            <Ionicons name="images-outline" size={11} color="white" />
                                            <Text className="text-white text-[9px] font-lato-bold ml-1">View {apiMedia.length} Photos</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <ImageLightbox
                                    visible={isImageLightboxVisible}
                                    images={lightboxImages}
                                    onClose={() => setIsImageLightboxVisible(false)}
                                />

                                <View className="p-3">
                                    <View className="flex-row items-center mb-1.5">
                                        <Text className="text-gray-400 text-[11px] font-lato">Possession: {displayPossession}</Text>
                                        <View className="w-1 h-1 rounded-full bg-gray-300 mx-1.5" />
                                        <Text className="text-gray-400 text-[11px] font-lato">Avg Price per sq ft: {displayAvgPrice}</Text>
                                    </View>

                                    <View className="flex-row items-center justify-between mb-0.5">
                                        <Text className="text-[#1A1A1A] text-[18px] font-lato-bold">{displayProjectTitle}</Text>
                                        {displayReraApproved ? (
                                            <View className="bg-green-50 px-1.5 py-0.5 rounded flex-row items-center border border-green-100">
                                                <Text className="text-[#10B981] text-[8px] font-lato-bold mr-1">RERA</Text>
                                                <Ionicons name="checkmark-circle" size={9} color="#10B981" />
                                            </View>
                                        ) : (
                                            <View className="bg-red-50 px-1.5 py-0.5 rounded flex-row items-center border border-red-100">
                                                <Text className="text-red-400 text-[8px] font-lato-bold mr-1">RERA</Text>
                                                <Ionicons name="close-circle" size={9} color="#F87171" />
                                            </View>
                                        )}
                                    </View>
                                    <Text className="text-gray-400 text-[13px] font-lato mb-2.5">{displayProjectLocation}</Text>

                                    {/* Project Approval & Pipeline Status */}
                                    {(() => {
                                        const currentProject = projectOptions.find(p => p.id === selectedProjectId);
                                        const stageKey = apiPipeline?.stage || currentProject?.leadStage || (currentProject?.status === 'active' ? 'project_live' : 'new_lead');
                                        const meta = PIPELINE_STAGE_META[stageKey] || PIPELINE_STAGE_META.new_lead;
                                        const progress = apiPipeline?.onboarding_progress !== undefined ? apiPipeline.onboarding_progress : (currentProject?.onboardingProgress !== undefined ? currentProject.onboardingProgress : (stageKey === 'project_live' ? 100 : 15));

                                        return (
                                            <View
                                                style={{
                                                    backgroundColor: meta.badgeBg,
                                                    borderColor: meta.badgeBorder,
                                                    borderWidth: 1,
                                                    borderRadius: 12,
                                                    padding: 10,
                                                    marginBottom: 12,
                                                }}
                                            >
                                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                                                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
                                                        <Ionicons name={meta.icon} size={15} color={meta.badgeText} style={{ marginRight: 6 }} />
                                                        <Text style={{ fontSize: 12, fontFamily: "Lato-Bold", color: meta.badgeText, fontWeight: "700" }}>
                                                            {meta.label}
                                                        </Text>
                                                    </View>
                                                    <View style={{ backgroundColor: "rgba(255,255,255,0.7)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99 }}>
                                                        <Text style={{ fontSize: 10, fontFamily: "Lato-Bold", color: meta.badgeText, fontWeight: "700" }}>
                                                            {progress}%
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text style={{ fontSize: 10, fontFamily: "Lato", color: "#64748B", marginTop: 3 }}>
                                                    {meta.sublabel}
                                                </Text>
                                                {apiPipeline?.assigned_officer?.name ? (
                                                    <Text style={{ fontSize: 10, fontFamily: "Lato", color: "#334155", marginTop: 4 }}>
                                                        Assigned Officer: {apiPipeline.assigned_officer.name} {apiPipeline.assigned_officer.phone ? `(${apiPipeline.assigned_officer.phone})` : ""}
                                                    </Text>
                                                ) : null}
                                                <View style={{ height: 4, backgroundColor: "rgba(0,0,0,0.06)", borderRadius: 2, marginTop: 7, overflow: "hidden" }}>
                                                    <View style={{ height: "100%", width: `${Math.max(5, progress)}%`, backgroundColor: meta.badgeText, borderRadius: 2 }} />
                                                </View>
                                            </View>
                                        );
                                    })()}

                                    <View className="border-t border-dashed border-gray-200 pt-2.5 mb-2.5">
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            <View className="flex-row">
                                                {displayApartments.map((apt, idx) => (
                                                    <View key={idx} className={`${idx !== 0 ? "border-l border-gray-100 pl-3 ml-3" : ""} min-w-[80px]`}>
                                                        <Text className="text-gray-400 text-[10px] font-lato-bold uppercase mb-0.5">{apt.type}</Text>
                                                        <Text className="text-[#1A1A1A] text-[13px] font-lato-bold">{apt.price}</Text>
                                                    </View>
                                                ))}
                                                {displayApartments.length === 0 && (
                                                    <Text className="text-gray-400 text-[11px] font-lato">No unit summary added yet.</Text>
                                                )}
                                            </View>
                                        </ScrollView>
                                    </View>

                                    <View className="flex-row justify-between mb-4">
                                        <View className="flex-1 bg-[#EEF4FF] border border-[#DDE8FF] rounded-lg py-1.5 items-center mr-1.5 min-w-0">
                                            <Text className="text-[#2563EB] text-[8px] font-lato-bold uppercase">Total</Text>
                                            <Text className="text-[#1A1A1A] text-[11px] font-lato-bold">{displayUnits.total || 0}</Text>
                                        </View>
                                        <View className="flex-1 bg-[#ECFBF6] border border-[#D7F5E8] rounded-lg py-1.5 items-center mr-1.5 min-w-0">
                                            <Text className="text-[#10B981] text-[8px] font-lato-bold uppercase">Avail</Text>
                                            <Text className="text-[#1A1A1A] text-[11px] font-lato-bold">{displayUnits.avail || 0}</Text>
                                        </View>
                                        <View className="flex-1 bg-[#FFF3EF] border border-[#FFE1D6] rounded-lg py-1.5 items-center mr-1.5 min-w-0">
                                            <Text className="text-[#EF4444] text-[8px] font-lato-bold uppercase">Sold</Text>
                                            <Text className="text-[#1A1A1A] text-[11px] font-lato-bold">{displayUnits.sold || 0}</Text>
                                        </View>
                                        <View className="flex-1 bg-[#FFF8EA] border border-[#FDECC8] rounded-lg py-1.5 items-center mr-1.5 min-w-0">
                                            <Text className="text-[#D98A1B] text-[8px] font-lato-bold uppercase">Booked</Text>
                                            <Text className="text-[#1A1A1A] text-[11px] font-lato-bold">{displayUnits.booked || 0}</Text>
                                        </View>
                                    </View>
                                </View>
                                </>
                            )}
                        </View>
                        )}
                    </View>
                ) : activeTab === "Inventory" ? (
                    <View className="p-4">
                        {isInventoryLoading && !refreshing ? (
                            <View className="py-12 items-center">
                                <ActivityIndicator size="large" color="#4A43EC" />
                                <Text className="mt-3 text-gray-400 font-lato text-center">Loading inventory...</Text>
                            </View>
                        ) : availableInventoryTabs.length > 0 ? (
                            <>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
                                    {availableInventoryTabs.map((tab) => (
                                        <TouchableOpacity
                                            key={tab.key}
                                            onPress={() => setInventoryType(tab.key)}
                                            className={`px-[18px] py-1.5 rounded-full mr-2.5 ${inventoryType === tab.key ? "bg-[#3D30F2]" : "bg-white border border-gray-100"}`}
                                        >
                                            <Text className={`font-lato-bold text-[11px] ${inventoryType === tab.key ? "text-white" : "text-gray-400"}`}>
                                                {tab.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {renderInventoryBoxes()}
                            </>
                        ) : (
                            <View className="py-12 items-center">
                                <Text className="text-gray-400 font-lato text-center">No inventory added for this project yet.</Text>
                            </View>
                        )}
                    </View>
                ) : activeTab === "Visits" ? (
                    <ScrollView
                        className="px-5 pt-5"
                        alwaysBounceVertical={true}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={['#4A43EC']}
                                tintColor="#4A43EC"
                            />
                        }
                    >
                        {visitsLoading && !refreshing ? (
                            <View className="py-10">
                                <ActivityIndicator size="large" color="#4A43EC" />
                                <Text className="text-center text-gray-500 mt-3 font-lato">Loading visits...</Text>
                            </View>
                        ) : (
                            <>
                                {/* Visit Stats */}
                                <View className="flex-row justify-between mb-4">
                                    {visitStats ? (
                                        <>
                                            <View className="flex-1 bg-white rounded-[16px] border border-gray-100 items-center justify-center py-3.5 mr-3" style={{ minHeight: 96 }}>
                                                <Text className="text-[#7C8AA5] text-[9px] font-lato-bold uppercase tracking-[1px]">TOTAL</Text>
                                                <Text className="mt-1 text-[24px] leading-[26px] font-lato-bold text-[#4A43EC]">
                                                    {visitStats.total || 0}
                                                </Text>
                                                <Text className="mt-1 text-[10px] font-lato text-[#8E9AAF]">Visits</Text>
                                            </View>
                                            <View className="flex-1 bg-white rounded-[16px] border border-gray-100 items-center justify-center py-3.5 mr-3" style={{ minHeight: 96 }}>
                                                <Text className="text-[#7C8AA5] text-[9px] font-lato-bold uppercase tracking-[1px]">HOT</Text>
                                                <Text className="mt-1 text-[24px] leading-[26px] font-lato-bold text-[#F97316]">
                                                    {visitStats.hot || 0}
                                                </Text>
                                                <Text className="mt-1 text-[10px] font-lato text-[#8E9AAF]">Leads</Text>
                                            </View>
                                            <View className="flex-1 bg-white rounded-[16px] border border-gray-100 items-center justify-center py-3.5" style={{ minHeight: 96 }}>
                                                <Text className="text-[#7C8AA5] text-[9px] font-lato-bold uppercase tracking-[1px]">CONV</Text>
                                                <Text className="mt-1 text-[24px] leading-[26px] font-lato-bold text-[#22C55E]">
                                                    {visitStats.conv || 0}
                                                </Text>
                                                <Text className="mt-1 text-[10px] font-lato text-[#8E9AAF]">Completed</Text>
                                            </View>
                                        </>
                                    ) : (
                                        <View className="flex-1 bg-white rounded-[16px] border border-gray-100 py-8 px-5">
                                            <Text className="text-gray-400 font-lato text-center">No visit metrics available</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Project visits, including completed visits and their result. */}
                                <View className="flex-row items-center justify-between mb-3">
                                    <Text className="text-[16px] font-lato-bold text-[#1F2937]">Project Visits</Text>
                                    {upcomingVisits.length > 0 && (
                                        <TouchableOpacity>
                                            <Text className="text-[12px] font-lato-bold text-[#4A43EC]">See All</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <View className="mb-4">
                                    {upcomingVisits.length > 0 ? (
                                        upcomingVisits.map((visit) => {
                                            // Generate initials from customer name
                                            const getInitials = (name) => {
                                                if (!name) return '?';
                                                const parts = name.trim().split(' ');
                                                if (parts.length >= 2) {
                                                    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                                                }
                                                return name.substring(0, 2).toUpperCase();
                                            };

                                            // Format date and time
                                            const formatDateTime = (dateString) => {
                                                if (!dateString) return '';
                                                const date = new Date(dateString);
                                                const today = new Date();
                                                const tomorrow = new Date(today);
                                                tomorrow.setDate(tomorrow.getDate() + 1);

                                                const isToday = date.toDateString() === today.toDateString();
                                                const isTomorrow = date.toDateString() === tomorrow.toDateString();

                                                const timeStr = date.toLocaleTimeString('en-US', {
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                    hour12: true
                                                });

                                                if (isToday) return `Today, ${timeStr}`;
                                                if (isTomorrow) return `Tomorrow, ${timeStr}`;

                                                return date.toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                    hour12: true
                                                });
                                            };

                                            // Map lead temperature to color
                                            const getTempColor = (temp) => {
                                                if (!temp) return 'indigo';
                                                const t = temp.toLowerCase();
                                                if (t === 'hot') return 'orange';
                                                if (t === 'warm') return 'indigo';
                                                return 'indigo';
                                            };

                                            const tempColor = getTempColor(visit.lead_temperature);
                                            const tempLabel = visit.lead_temperature ? visit.lead_temperature.charAt(0).toUpperCase() + visit.lead_temperature.slice(1) : 'Warm';

                                            return (
                                                <View
                                                    key={visit.id}
                                                    className="bg-white rounded-[16px] border border-gray-100 px-3 py-3 mb-2.5"
                                                >
                                                    <View className="flex-row items-start">
                                                        <View className="w-9 h-9 rounded-full bg-[#E8ECFF] items-center justify-center mr-3 mt-0.5">
                                                            <Text className="text-[11px] font-lato-bold text-[#4A43EC]">
                                                                {getInitials(visit.customer?.name)}
                                                            </Text>
                                                        </View>

                                                        <View className="flex-1 pr-3">
                                                            <View className="flex-row items-start justify-between">
                                                                <View className="flex-1 pr-2">
                                                                    <Text className="text-[14px] font-lato-bold text-[#1F2937] leading-4">
                                                                        {visit.customer?.name || 'Unknown Customer'}
                                                                    </Text>
                                                                    <Text className="mt-0.5 text-[11px] font-lato text-[#8E9AAF]" numberOfLines={1}>
                                                                        {visit.property?.title || visit.project?.name || 'Property'}
                                                                    </Text>
                                                                </View>
                                                                <View className={`px-2.5 py-1 rounded-full ${getVisitChipStyle(tempColor)}`}>
                                                                    <Text className="text-[9px] font-lato-bold">{tempLabel}</Text>
                                                                </View>
                                                            </View>

                                                            <View className="flex-row items-center mt-2">
                                                                <View className={`px-2.5 py-1 rounded-md ${getVisitChipStyle(tempColor)}`}>
                                                                    <Text className="text-[9px] font-lato-bold">
                                                                        {visit.property?.configuration || visit.property?.bedrooms ? `${visit.property.bedrooms} BHK` : 'Visit'}
                                                                    </Text>
                                                                </View>
                                                                <Text className="ml-2.5 text-[11px] font-lato text-[#8E9AAF]">
                                                                    {formatDateTime(visit.slot_start)}
                                                                </Text>
                                                            </View>

                                                            {visit.sales_officer?.name && (
                                                                <Text className="mt-2 text-[10px] font-lato text-[#8E9AAF]">
                                                                    Officer: {visit.sales_officer.name}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    </View>
                                                </View>
                                            );
                                        })
                                    ) : (
                                        <View className="bg-white rounded-[16px] border border-gray-100 py-8 px-5">
                                            <Ionicons name="calendar-outline" size={32} color="#D1D5DB" style={{ alignSelf: 'center', marginBottom: 8 }} />
                                            <Text className="text-gray-400 font-lato text-center">No visits scheduled for this project</Text>
                                        </View>
                                    )}
                                </View>
                            </>
                        )}
                    </ScrollView>
                ) : activeTab === "Deals" ? (
                    <ScrollView
                        className="px-5 pt-5 pb-4"
                        alwaysBounceVertical={true}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={['#4A43EC']}
                                tintColor="#4A43EC"
                            />
                        }
                    >
                        {dealsLoading && !refreshing ? (
                            <View className="gap-3">
                                {[0, 1, 2].map((i) => (
                                    <View key={i} className="bg-white rounded-[16px] border border-[#E3E7F0] px-3 pt-3 pb-3">
                                        <View className="flex-row items-start justify-between mb-3">
                                            <View className="flex-1 pr-2 gap-1.5">
                                                <SkeletonBox width="65%" height={13} borderRadius={5} />
                                                <SkeletonBox width="45%" height={10} borderRadius={4} />
                                            </View>
                                            <View className="items-end gap-1.5">
                                                <SkeletonBox width={52} height={18} borderRadius={20} />
                                                <SkeletonBox width={40} height={9} borderRadius={4} />
                                            </View>
                                        </View>
                                        <View className="mb-3 gap-1.5">
                                            <View className="flex-row justify-between">
                                                <SkeletonBox width={100} height={10} borderRadius={4} />
                                                <SkeletonBox width={30} height={10} borderRadius={4} />
                                            </View>
                                            <SkeletonBox width="100%" height={6} borderRadius={6} />
                                        </View>
                                        <View className="flex-row gap-2">
                                            <View className="flex-1 rounded-md bg-[#F7F8FC] px-2 py-2 gap-1">
                                                <SkeletonBox width={60} height={8} borderRadius={3} />
                                                <SkeletonBox width={70} height={13} borderRadius={4} />
                                            </View>
                                            <View className="flex-1 rounded-md bg-[#F7F8FC] px-2 py-2 gap-1">
                                                <SkeletonBox width={40} height={8} borderRadius={3} />
                                                <SkeletonBox width={70} height={13} borderRadius={4} />
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (Array.isArray(deals) ? deals : deals?.data || []).length > 0 ? (
                            
                        
                            (Array.isArray(deals) ? deals : deals?.data || []).map((deal) => {
                                const dealId = deal.deal_id || deal.id;
                                const totalAmount = Number(deal.total_amount || deal.deal_value || deal.amount || 0);
                                const paidAmount = Number(
                                    deal.received_amount ||
                                    deal.paid ||
                                    0
                                );

                                // Calculate dynamic percentage safely without dividing by zero
                                const paymentPercentage = deal.payment_progress_percent ?? (totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0);

                                const customerName = deal.booked_by_name || deal.customer_name || deal.customer?.name || 'Customer';
                                const customerPhone = deal.booked_by_mobile || deal.mobile || deal.customer_phone || deal.customer?.phone || 'N/A';
                                const propertyTitle = deal.unit_title || deal.display_title || deal.property_title || deal.property?.title || 'Property Unit';
                                const dealStatus = deal.deal_status || deal.status;

                                return (
                                    <TouchableOpacity
                                        key={dealId || Math.random().toString()}
                                        activeOpacity={0.9}
                                        onPress={async () => {
                                            if (deal.canonical_deal_id) { router.push({ pathname: "/(screens)/project-deal", params: { id: deal.canonical_deal_id } }); return; }
                                            const base = {
                                                id: dealId,
                                                deal_id: dealId,
                                                dealId: dealId,
                                                inventory_unit_id: deal.inventory_unit_id,
                                                title: propertyTitle,
                                                property_title: propertyTitle,
                                                booked_by_name: customerName,
                                                bookedBy: customerName,
                                                booked_by_mobile: customerPhone,
                                                mobile: customerPhone,
                                                booking_date: deal.booking_date,
                                                bookingDate: deal.booking_date,
                                                total_amount: totalAmount,
                                                total_value: totalAmount,
                                                deal_value: totalAmount,
                                                dealValue: totalAmount,
                                                received_amount: paidAmount,
                                                paid_amount: paidAmount,
                                                progress: paymentPercentage,
                                                payment_progress_percent: paymentPercentage,
                                                pending_amount: deal.pending_amount ?? (totalAmount - paidAmount),
                                                token_amount: deal.token_amount || null,
                                                tokenAmount: deal.token_amount || null,
                                                payment_schedule: deal.payment_schedule || [],
                                                area: deal.area || deal.area_sqft || null,
                                                possession: deal.possession || deal.possession_date || null,
                                                amenities: [],
                                                images: [],
                                                avgPricePerSqft: null,
                                                showDealSummary: true,
                                                showFollowUps: false,
                                            };

                                            // Fetch full unit details to enrich area, possession, amenities, images
                                            if (deal.inventory_unit_id) {
                                                try {
                                                    setUnitDetailLoading(true);
                                                    const res = await inventoryService.getInventoryUnitDetails(deal.inventory_unit_id);
                                                    const details = res?.data;
                                                    if (details) {
                                                        const proj = details.project || {};
                                                        base.area = details.area || base.area;
                                                        base.area_sqft = details.area_sqft || base.area_sqft;
                                                        base.possession = details.possession || base.possession;
                                                        base.possession_date = details.possession_date;
                                                        base.avgPricePerSqft = proj.avg_price_per_sqft_display || proj.avg_price_per_sqft || null;
                                                        base.images = (details.media || []).filter(m => m.media_type === 'image').map(m => ({ uri: m.url }));
                                                        base.amenities = (details.amenities || []).map(a => a.name);
                                                        base.is_verified = proj.is_verified;
                                                        if (details.deal_summary?.token_amount) {
                                                            base.token_amount = details.deal_summary.token_amount;
                                                            base.tokenAmount = details.deal_summary.token_amount;
                                                        }
                                                        if (details.deal_summary?.payment_schedule?.length) {
                                                            base.payment_schedule = details.deal_summary.payment_schedule;
                                                        }
                                                    }
                                                } catch (err) {
                                                    console.log('⚠️ [HOME] Unit detail fetch failed for deal modal:', err);
                                                } finally {
                                                    setUnitDetailLoading(false);
                                                }
                                            }

                                            setSelectedDeal(base);
                                            setIsProjectDetailVisible(true);
                                        }}
                                        className="bg-white rounded-[16px] border border-[#E3E7F0] mb-3.5 overflow-hidden"
                                        style={{
                                            shadowColor: "#0F172A",
                                            shadowOffset: { width: 0, height: 1 },
                                            shadowOpacity: 0.04,
                                            shadowRadius: 8,
                                            elevation: 1,
                                        }}
                                    >
                                        <View className="px-3 pt-2 pb-2">
                                            <View className="flex-row items-start justify-between mb-1">
                                                <View className="flex-1 pr-2">
                                                    <Text className="text-[13px] font-lato-bold text-[#1F2937] leading-4" numberOfLines={1}>
                                                        {propertyTitle}
                                                    </Text>
                                                    <Text className="mt-0.5 text-[11px] font-lato text-[#7E889A]" numberOfLines={1}>
                                                        {customerName} • {customerPhone}
                                                    </Text>
                                                </View>
                                                <View className="items-end">
                                                    <View className={`px-2 py-0.5 rounded-full ${getDealStatusStyle(dealStatus === 'closed' || dealStatus === 'completed' ? 'success' : dealStatus === 'active' || dealStatus === 'tokened' ? 'info' : 'muted')}`}>
                                                        <Text className="text-[9px] font-lato-bold">{(dealStatus || 'PENDING').toUpperCase()}</Text>
                                                    </View>
                                                    <Text className="mt-1 text-[10px] font-lato text-[#8E98AA]">
                                                        {deal.created_at ? new Date(deal.created_at).toLocaleDateString() : 'N/A'}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View className="mb-2">
                                                <View className="flex-row items-center justify-between mb-1">
                                                    <Text className="text-[11px] font-lato-bold text-[#4B5563]">Payment Progress</Text>
                                                    <Text className="text-[11px] font-lato-bold text-[#6F5DF5]">{paymentPercentage}%</Text>
                                                </View>
                                                <View className="h-[6px] rounded-full bg-[#ECEFF6] overflow-hidden">
                                                    <View
                                                        className="h-full bg-[#3029E8] rounded-full"
                                                        style={{ width: `${paymentPercentage}%` }}
                                                    />
                                                </View>
                                            </View>

                                            <View className="flex-row gap-2">
                                                <View className="flex-1 rounded-md bg-[#F7F8FC] px-2 py-1">
                                                    <Text className="text-[9px] font-lato-bold text-[#96A0B2]">DEAL VALUE</Text>
                                                    <Text className="mt-0.5 text-[12px] font-lato-bold text-[#1F2937]" numberOfLines={1}>
                                                        ₹{totalAmount > 0 ? (totalAmount / 100000).toFixed(2) + 'L' : 'N/A'}
                                                    </Text>
                                                </View>
                                                <View className="flex-1 rounded-md bg-[#F7F8FC] px-2 py-1">
                                                    <Text className="text-[9px] font-lato-bold text-[#96A0B2]">PAID</Text>
                                                    <Text className="mt-0.5 text-[12px] font-lato-bold text-[#1F2937]" numberOfLines={1}>
                                                        ₹{paidAmount > 0 ? (paidAmount / 100000).toFixed(2) + 'L' : '0.00L'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        ) : (
                            <View className="bg-white rounded-[16px] border border-gray-100 py-10 px-5">
                                <Ionicons name="document-text-outline" size={32} color="#D1D5DB" style={{ alignSelf: 'center', marginBottom: 8 }} />
                                <Text className="text-gray-400 font-lato text-center">No deals found for this project</Text>
                            </View>
                        )}
                    </ScrollView>
                ) : (
                    <View className="p-10 items-center">
                        <Text className="text-gray-400 font-lato">Coming Soon...</Text>
                    </View>
                )}
            </ScrollView>

            {unitDetailLoading && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                    <ActivityIndicator size="large" color="#4A43EC" />
                </View>
            )}

            <ProjectDetailModal
                visible={isProjectDetailVisible}
                onClose={() => {
                    setIsProjectDetailVisible(false);
                    setSelectedDeal(null);
                }}
                project={selectedProject}
                variant={selectedDeal}
                onVariantUpdate={handleDealVariantUpdate}
                showDealSummary={selectedDeal?.showDealSummary ?? true}
                showFollowUps={selectedDeal?.showFollowUps ?? false}
            />

            <Modal
                visible={isInventoryEditVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsInventoryEditVisible(false)}
            >
                <KeyboardAvoidingView
                    className="flex-1"
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                    <View className="flex-1 bg-black/45 justify-end">
                        <TouchableOpacity
                            activeOpacity={1}
                            className="flex-1"
                            onPress={() => setIsInventoryEditVisible(false)}
                        />

                        <View className="bg-white rounded-t-[28px] px-5 pt-4 pb-6">
                            <View className="items-center mb-4">
                                <View className="w-14 h-1.5 rounded-full bg-gray-300" />
                            </View>

                            <Text className="text-[18px] font-lato-bold text-[#1A1A1A]">Edit Property</Text>
                            <Text className="mt-1 text-[12px] font-lato text-[#6B7280]">You can update price and status here.</Text>

                            <View className="mt-5">
                                <Text className="text-[11px] font-lato-bold text-[#6B7280] uppercase mb-2">Price</Text>
                                <TextInput
                                    value={editPrice}
                                    onChangeText={setEditPrice}
                                    placeholder="Enter price"
                                    placeholderTextColor="#94A3B8"
                                    className="h-12 rounded-2xl border border-gray-200 px-4 text-[14px] font-lato text-[#111827] bg-white"
                                />
                            </View>

                            <View className="mt-4">
                                <Text className="text-[11px] font-lato-bold text-[#6B7280] uppercase mb-2">Area</Text>
                                <View className="h-12 rounded-2xl border border-gray-200 px-4 justify-center bg-gray-50">
                                    <Text className="text-[14px] font-lato text-[#6B7280]">{editArea || "-"}</Text>
                                </View>
                            </View>

                            <View className="mt-4">
                                <Text className="text-[11px] font-lato-bold text-[#6B7280] uppercase mb-2">Status</Text>
                                <View className="relative z-20">
                                    <TouchableOpacity
                                        activeOpacity={0.9}
                                        onPress={() => setIsStatusDropdownOpen((current) => !current)}
                                        className="h-12 rounded-2xl border border-gray-200 px-4 flex-row items-center justify-between bg-white"
                                    >
                                        <Text className="text-[14px] font-lato text-[#111827]">{editStatus}</Text>
                                        <Ionicons name={isStatusDropdownOpen ? "chevron-up" : "chevron-down"} size={16} color="#94A3B8" />
                                    </TouchableOpacity>
                                    {isStatusDropdownOpen ? (
                                        <View className="absolute left-0 right-0 bottom-[52px] z-30 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                                            {statusOptions.map((statusOption) => {
                                                const isSelectedStatus = editStatus === statusOption;

                                                return (
                                                    <TouchableOpacity
                                                        key={statusOption}
                                                        activeOpacity={0.85}
                                                        onPress={() => {
                                                            setEditStatus(statusOption);
                                                            setIsStatusDropdownOpen(false);
                                                        }}
                                                        className={`px-4 py-3 ${isSelectedStatus ? "bg-[#F4F3FF]" : "bg-white"}`}
                                                    >
                                                        <Text className={`text-[13px] font-lato-bold ${isSelectedStatus ? "text-[#4A43EC]" : "text-[#1F2937]"}`}>
                                                            {statusOption}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    ) : null}
                                </View>
                            </View>

                            <View className="flex-row gap-3 mt-6">
                                <TouchableOpacity
                                    onPress={() => setIsInventoryEditVisible(false)}
                                    className="flex-1 h-12 rounded-2xl border border-gray-200 items-center justify-center bg-white"
                                >
                                    <Text className="text-[13px] font-lato-bold text-[#64748B]">Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={saveInventoryEdit}
                                    className="flex-1 h-12 rounded-2xl items-center justify-center bg-[#4A43EC]"
                                >
                                    <Text className="text-[13px] font-lato-bold text-white">Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
