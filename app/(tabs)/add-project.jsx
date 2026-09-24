import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Image,
    Dimensions,
    TextInput,
    Platform,
    Pressable,
    Keyboard,
    TouchableWithoutFeedback,
    Modal,
    ActivityIndicator,
    FlatList,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useDispatch, useSelector } from "react-redux";
import {
    setStep,
    updateStep1,
    addPropertyType,
    removePropertyType,
    updatePropertyType,
    updateBuilderData,
    updateStep4,
    updateStep4Approval,
    updateStep5,
    updateStep6,
    bulkUploadSubtype,
    resetForm,
    setProjectId,
    setUploadMode,
} from "../../store/slices/projectSlice";
import { addProject } from "../../store/slices/projectsSlice";
import { addNotification } from "../../store/slices/notificationSlice";
import { projectFormApi, projectOverviewApi } from "../../services/api";
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Linking } from 'react-native';
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import LocationMapPicker from '../../components/LocationMapPicker';

const { width } = Dimensions.get("window");

const mainTypes = [
    {
        id: "residential",
        label: "Residential",
        image: require("../../assets/icons/property-types/House2.png"),
        cloudImage: require("../../assets/icons/property-types/Clouds.png"),
    },
    {
        id: "commercial",
        label: "Commercial",
        image: require("../../assets/icons/property-types/commercial.png"),
    },
];

const subTypesData = {
    residential: [
        { id: "plot", label: "Plot", image: require("../../assets/icons/property-types/plot.png") },
        { id: "villa", label: "Villa", image: require("../../assets/icons/property-types/villa.png") },
        { id: "apartment", label: "Apartment", image: require("../../assets/icons/property-types/apartment.png") },
        { id: "rowhouse", label: "Rowhouse", image: require("../../assets/icons/property-types/rowhouse.png") },
    ],
    commercial: [
        { id: "shop", label: "Shop", image: require("../../assets/icons/property-types/Shop.png") },
        { id: "showroom", label: "Showroom", image: require("../../assets/icons/property-types/showroom.png") },
        { id: "office", label: "Office", image: require("../../assets/icons/property-types/office.png") },
    ]
};

const bhkOptions = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK", "5 BHK+"];
const officeTypes = ["Co-working", "Ready to Move", "Bare Shell"];
const areaUnits = [
    'Sq-ft', 'Sq-yrd', 'Sq-m', 'Acre', 'Bigha', 
    'Hectare', 'Guntha', 'Kanal', 'Marla', 'Biswa', 'Kottah'
];

const steps = [
    { id: 1, title: "Basic Details" },
    { id: 2, title: "Property Type" },
    { id: 3, title: "Property Detail" },
    { id: 4, title: "Approvals" },
    { id: 5, title: "Finance" },
    { id: 6, title: "Image & Price" },
];

const ANDROID_KEYBOARD_EXTRA_SCROLL = 72;
const ANDROID_KEYBOARD_EXTRA_HEIGHT = 240;
const IOS_KEYBOARD_EXTRA_SCROLL = 40;
const IOS_KEYBOARD_EXTRA_HEIGHT = 66;
const ANDROID_CONTENT_BOTTOM_PADDING = 180;
const IOS_CONTENT_BOTTOM_PADDING = 140;
const RANGE_BASED_SUB_TYPES = new Set(["plot", "villa", "rowhouse"]);
const DEVELOPMENT_STAGE_OPTIONS = [
    "Road work completed",
    "Drainage work completed",
    "Electricity work completed",
    "Water line completed",
    "Boundary wall completed",
    "Garden / Park work completed",
    "Street lights completed",
    "Main gate completed",
    "Clubhouse / Amenities work completed",
    "Work in progress",
    "Other",
];
const APPROVAL_STATUS_OPTIONS = ["Yes", "No"];
const OPTIONAL_APPROVAL_STATUS_OPTIONS = ["Yes", "No", "Not Applicable"];
const OVERALL_APPROVAL_STATUS_OPTIONS = [
    "All approvals completed",
    "Major approvals completed",
    "Some approvals pending",
    "Approvals under process",
    "Not verified yet",
];
const GUIDELINE_VALUE_UNITS = ["Per Sq. Ft.", "Per Sq. Meter", "Per Acre", "Per Hectare"];
const OWNERSHIP_TYPES = [
    "Owned Project",
    "Joint Venture Project",
    "Development Agreement Project",
    "Collaboration Project",
    "Other",
];

export default function AddProject() {
    const dispatch = useDispatch();
    const { currentStep, step1, step2, step3, step4, step5, step6 } = useSelector((state) => state.project);
    const projectId = useSelector((state) => state.project.projectId);
    const scrollRef = useRef(null);
    const [step1Errors, setStep1Errors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Drafts modal state
    const [draftsVisible, setDraftsVisible] = useState(false);
    const [drafts, setDrafts] = useState([]);
    const [draftsLoading, setDraftsLoading] = useState(false);

    const loadDrafts = async () => {
        setDraftsLoading(true);
        try {
            const res = await projectOverviewApi.getDraftProjects();
            setDrafts(res.data?.data || []);
        } catch (e) {
            console.error("Failed to load drafts", e);
        } finally {
            setDraftsLoading(false);
        }
    };

    const openDrafts = () => {
        setDraftsVisible(true);
        loadDrafts();
    };

    const resumeDraft = async (draft) => {
        dispatch(resetForm());
        dispatch(setProjectId(draft.id));
        setDraftsVisible(false);

        try {
            const res = await projectFormApi.getProjectFormResume(draft.id);
            const resumeData = res.data?.data;
            if (!resumeData) throw new Error("Empty resume data");

            const s1 = resumeData.step1 || {};
            const s2 = resumeData.step2 || {};
            const s4 = resumeData.step4 || {};
            const s5 = resumeData.step5 || {};

            console.log('🔍 [RESUME step5]', JSON.stringify(s5, null, 2));

            // Step 1
            dispatch(updateStep1({
                projectName: s1.name || '',
                location: s1.location || '',
                city: s1.city || '',
                state: s1.state || '',
                pincode: s1.pincode || '',
                latitude: s1.latitude ?? null,
                longitude: s1.longitude ?? null,
                salesOfficerName: s1.sales_officer_name || '',
                salesOfficerContact: s1.sales_officer_contact || '',
                responsiblePersonName: s1.responsible_person_name || '',
                responsiblePersonContact: s1.responsible_person_contact || '',
            }));

            // Step 2 — deduplicated property types from variants
            const variants = resumeData.step3?.variants || [];
            const dbUnits  = resumeData.step3?.units    || [];
            const seen = new Set();
            // typeId -> { mainType, subType, typeId }
            const typeMap = {};

            variants.forEach((v) => {
                const mainType = v.property_type === 'commercial' ? 'commercial' : 'residential';
                const subType  = String(v.property_subtype || '');
                const key      = `${mainType}_${subType}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    dispatch(addPropertyType({ id: subType, mainType, subType }));
                    typeMap[subType] = { mainType, subType, typeId: subType };
                }
            });

            // Also restore from step2.property_types if variants are empty
            if (variants.length === 0) {
                (s2.property_types || []).forEach((pt) => {
                    const key = `${pt.main_type}_${pt.sub_type}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        dispatch(addPropertyType({ id: String(pt.sub_type || ''), mainType: pt.main_type, subType: String(pt.sub_type || '') }));
                        typeMap[pt.sub_type] = { mainType: pt.main_type, subType: String(pt.sub_type || ''), typeId: String(pt.sub_type || '') };
                    }
                });
            }

            // Step 3 — rebuild unitConfigs from saved units + variants
            const variantById = {};
            variants.forEach((v) => { variantById[v.id] = v; });

            // Group DB units by subType
            const unitsBySubType = {};
            dbUnits.forEach((u) => {
                const variant = variantById[u.property_id];
                if (!variant) return;
                const subType = variant.property_subtype;
                if (!unitsBySubType[subType]) unitsBySubType[subType] = [];
                unitsBySubType[subType].push({ unit: u, variant });
            });

            const parseJsonField = (val) => {
                if (Array.isArray(val)) return val;
                try { return JSON.parse(val || '[]'); } catch { return []; }
            };

            const buildUnitConfig = (unit, variant) => {
                const bhkLabel = variant.category_type || (variant.bedrooms ? `${variant.bedrooms} BHK` : variant.property_subtype);
                return {
                    tower:          unit?.block_name || '',
                    floor:          unit?.floor != null ? String(unit.floor) : '',
                    bhk:            bhkLabel,
                    officeType:     bhkLabel,
                    variantName:    variant.variant_name || '',
                    area:           variant.area_sqft != null ? String(variant.area_sqft) : '',
                    areaUnit:       variant.area_unit || unit?.area_unit || 'Sq-ft',
                    price:          variant.selling_price != null ? String(variant.selling_price) : '',
                    images:         mapResumedVariantImages(variant.images),
                    amenities:      parseJsonField(variant.amenities).length > 0 ? parseJsonField(variant.amenities) : [''],
                    extraCharges:   parseJsonField(variant.extra_charges).length > 0 ? parseJsonField(variant.extra_charges) : [{ title: '', amount: '' }],
                    brochure:       mapResumedBrochure(variant.brochure_url),
                    propertyNumber: unit?.unit_number || '',
                    hasShop:        false,
                };
            };

            // For each subType dispatch bulkUploadSubtype to restore unitConfigs + builder state
            const RESUME_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

            const parseFloorNum = (floorVal, fallback) => {
                if (floorVal == null) return fallback;
                const n = parseInt(String(floorVal).replace(/\D/g, ''), 10);
                return isNaN(n) ? fallback : n;
            };

            const buildBuilderState = (subType, entries) => {
                // Group by block_name
                const sectionMap = {};
                const sectionOrder = [];
                entries.forEach(({ unit, variant }) => {
                    const sec = unit?.block_name || 'Block A';
                    if (!sectionMap[sec]) { sectionMap[sec] = []; sectionOrder.push(sec); }
                    sectionMap[sec].push({ unit, variant });
                });

                const sections = sectionOrder.map((secName, secIdx) => {
                    const sEntries = sectionMap[secName];
                    // Build unique configs per variant
                    const variantToConfigId = {};
                    const configs = [];
                    sEntries.forEach(({ variant }) => {
                        if (!variantToConfigId[variant.id]) {
                            const cfgId = 'cfg_' + variant.id;
                            variantToConfigId[variant.id] = cfgId;
                            configs.push({
                                id: cfgId,
                                type: variant.category_type || variant.property_subtype || '',
                                name: variant.variant_name || '',
                                area: variant.area_sqft != null ? String(variant.area_sqft) : '',
                                areaUnit: variant.area_unit || 'Sq-ft',
                                price: variant.selling_price != null ? String(variant.selling_price) : '',
                                color: RESUME_COLORS[configs.length % RESUME_COLORS.length],
                                images: mapResumedVariantImages(variant.images),
                                brochure: mapResumedBrochure(variant.brochure_url),
                                amenities: parseJsonField(variant.amenities).filter(Boolean).length > 0
                                    ? parseJsonField(variant.amenities).filter(Boolean) : [''],
                                extra_charges: parseJsonField(variant.extra_charges).length > 0
                                    ? parseJsonField(variant.extra_charges)
                                    : [{ title: '', amount: '' }],
                            });
                        }
                    });

                    // Group by floor for unitMap
                    const floorGroups = {};
                    sEntries.forEach(({ unit, variant }, idx) => {
                        const floor = parseFloorNum(unit?.floor, idx + 1);
                        if (!floorGroups[floor]) floorGroups[floor] = [];
                        floorGroups[floor].push({ unit, variant });
                    });

                    const unitMap = {};
                    const unitOverrides = {};
                    const rowUnitCounts = {};

                    const allFloors = Object.keys(floorGroups).map(Number).filter(n => !isNaN(n));
                    // Prefer saved values from DB
                    const savedFloors = sEntries[0]?.variant?.section_floors;
                    const builderMeta = sEntries[0]?.variant?.builder_meta;
                    const savedUnitsPerFloor = (builderMeta && typeof builderMeta === 'object')
                        ? builderMeta.units_per_floor
                        : (typeof builderMeta === 'string' ? JSON.parse(builderMeta || '{}')?.units_per_floor : null);

                    // floorCount: saved value > max painted floor number > distinct floor count
                    const maxPaintedFloor = allFloors.length > 0 ? Math.max(...allFloors) : sEntries.length;
                    const floorCount = savedFloors || maxPaintedFloor;

                    // units per floor = saved value, else max painted per any floor
                    const maxPaintedPerFloor = Object.values(floorGroups).length > 0
                        ? Math.max(...Object.values(floorGroups).map(g => g.length), 1)
                        : 1;
                    const maxCol = savedUnitsPerFloor || maxPaintedPerFloor;

                    for (let row = 1; row <= floorCount; row++) {
                        rowUnitCounts[row] = maxCol;
                    }

                    // Fill the actual assigned units for the floors that were saved
                    allFloors.forEach((floor) => {
                        const row = floor;
                        const fEntries = floorGroups[floor];
                        fEntries.forEach(({ unit, variant }, colIdx) => {
                            let col = colIdx + 1; // fallback
                            if (unit?.unit_number) {
                                const numStr = String(unit.unit_number);
                                const floorStr = String(floor);
                                if (numStr.startsWith(floorStr)) {
                                    const colPart = parseInt(numStr.slice(floorStr.length), 10);
                                    if (!isNaN(colPart) && colPart > 0) col = colPart;
                                }
                            }
                            const key = `${row}_${col}`;
                            unitMap[key] = variantToConfigId[variant.id];
                            if (unit?.unit_number) unitOverrides[key] = { customName: unit.unit_number };
                        });
                    });

                    // Second pass: auto-fill room numbers for empty cells
                    for (let r = 1; r <= floorCount; r++) {
                        for (let c = 1; c <= maxCol; c++) {
                            const key = `${r}_${c}`;
                            if (!unitOverrides[key]) {
                                const colStr = c < 10 ? `0${c}` : `${c}`;
                                unitOverrides[key] = { customName: `${r}${colStr}` };
                            }
                        }
                    }

                    return {
                        id: secIdx + 1,
                        name: secName,
                        floors: floorCount, rows: floorCount, lanes: floorCount,
                        unitsPerFloor: maxCol, plotsPerRow: maxCol, villasPerLane: maxCol,
                        configs, unitMap, rowUnitCounts, unitOverrides,
                    };
                });

                const finalSections = sections.length > 0 ? sections : getDefaultBuilderState(subType).sections;
                return {
                    sections: finalSections,
                    activeSectionId: finalSections[0]?.id || 1,
                    activeConfigId: finalSections[0]?.configs[0]?.id || null,
                    gridMode: 'paint',
                    selectedUnitKey: null,
                };
            };

            Object.entries(unitsBySubType).forEach(([subType, entries]) => {
                const unitConfigs = entries.map(({ unit, variant }) => buildUnitConfig(unit, variant));
                dispatch(bulkUploadSubtype({ typeId: subType, unitConfigs }));
                dispatch(setUploadMode({ typeId: subType, mode: 'bulk' }));
                dispatch(updateBuilderData({
                    typeId: subType,
                    subType,
                    builderState: buildBuilderState(subType, entries),
                }));
            });

            // Fallback: variants exist but no units saved — restore from variant data directly
            variants.forEach((v) => {
                const subType = v.property_subtype;
                if (!unitsBySubType[subType]) {
                    const unitConfigs = [buildUnitConfig(null, v)];
                    dispatch(bulkUploadSubtype({ typeId: subType, unitConfigs }));
                    dispatch(setUploadMode({ typeId: subType, mode: 'bulk' }));
                    dispatch(updateBuilderData({
                        typeId: subType,
                        subType,
                        builderState: buildBuilderState(subType, [{ unit: null, variant: v }]),
                    }));
                }
            });

            // Step 4
            if (s4.possession_status || s4.project_launch_status || s4.development_progress != null || s4.overall_approval_status) {
                // Parse development_checklist safely
                const parseChecklist = (val) => {
                    if (Array.isArray(val)) return val;
                    try { return JSON.parse(val || '[]'); } catch { return []; }
                };

                dispatch(updateStep4({
                    possessionStatus: s4.possession_status
                        ? s4.possession_status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                        : '',
                    expectedPossessionDate: s4.expected_possession_date || '',
                    possessionRemarks: s4.possession_remarks || '',
                    projectLaunchStatus: s4.project_launch_status || '',
                    projectLaunchDate: s4.project_launch_date || '',
                    expectedLaunchDate: s4.expected_launch_date || '',
                    developmentCompletionPercentage: s4.development_progress != null ? String(s4.development_progress) : '',
                    currentDevelopmentStage: parseChecklist(s4.development_checklist),
                    developmentRemarks: s4.development_remarks || '',
                    otherDevelopmentStage: s4.other_development_stage || '',
                    overallApprovalStatus: s4.overall_approval_status || 'Not verified yet',
                }));

                const approvals = s4.approvals || {};
                // Only restore approval if it was explicitly set (expected_time present OR is_approved=true means it was set)
                // is_approved=false with no expected_time = DB default, skip to avoid showing "No" on untouched approvals
                const resolveApprovalStatus = (ap) => {
                    if (!ap) return '';
                    // Exact status preserved server-side (only RERA/Building
                    // Permission can be "Not Applicable" — everything else is a
                    // plain Yes/No, always safely covered by the fallback below).
                    if (ap.raw_status) return ap.raw_status;
                    if (ap.is_approved === true) return 'Yes';
                    if (ap.is_approved === false && ap.expected_time) return 'No';
                    return ''; // not set by user
                };

                if (approvals.tncp) dispatch(updateStep4Approval({ approvalKey: 'tncp', data: { status: resolveApprovalStatus(approvals.tncp), expectedTime: approvals.tncp.expected_time || '', approvalNumber: approvals.tncp.referenceNumber || '', approvalDate: approvals.tncp.approvalDate || '', documents: approvals.tncp.documents || [] } }));
                if (approvals.municipal) dispatch(updateStep4Approval({ approvalKey: 'buildingPermission', data: { status: resolveApprovalStatus(approvals.municipal), expectedTime: approvals.municipal.expected_time || '', permissionNumber: approvals.municipal.referenceNumber || '', permissionDate: approvals.municipal.approvalDate || '', documents: approvals.municipal.documents || [] } }));
                if (approvals.rera) dispatch(updateStep4Approval({ approvalKey: 'rera', data: { status: resolveApprovalStatus(approvals.rera), registrationNumber: approvals.rera.rera_id || '', expectedTime: approvals.rera.expected_time || '', registrationDate: approvals.rera.approvalDate || '', documents: approvals.rera.documents || [], reasonNotAvailable: approvals.rera.reason_not_available || '' } }));
                if (approvals.diversion) dispatch(updateStep4Approval({ approvalKey: 'diversion', data: { status: resolveApprovalStatus(approvals.diversion), expectedTime: approvals.diversion.expected_time || '', referenceNumber: approvals.diversion.referenceNumber || '', approvalDate: approvals.diversion.approvalDate || '', documents: approvals.diversion.documents || [] } }));
                if (approvals.developmentPermission) dispatch(updateStep4Approval({ approvalKey: 'developmentPermission', data: { status: resolveApprovalStatus(approvals.developmentPermission), expectedTime: approvals.developmentPermission.expected_time || '', permissionNumber: approvals.developmentPermission.referenceNumber || '', permissionDate: approvals.developmentPermission.approvalDate || '', documents: approvals.developmentPermission.documents || [] } }));
            }

            // Step 5
            const fin = s5.financial_details || {};
            const legal = s5.legal_details || {};
            const brokerage = s5.brokerage || {};
            const bankLoan = fin.bank_loan || {};
            const regCharges = (typeof fin.registry_charges === 'object' && fin.registry_charges) ? fin.registry_charges : {};

            const parseJsonArray = (val) => {
                if (Array.isArray(val)) return val;
                if (!val || val === '[]' || val === 'null') return [];
                if (typeof val === 'string') {
                    try {
                        const parsed = JSON.parse(val);
                        return Array.isArray(parsed) ? parsed : [];
                    } catch {
                        return val.split(',').map(item => item.trim()).filter(Boolean);
                    }
                }
                return [];
            };

            const parseJsonObject = (val) => {
                if (val && typeof val === 'object' && !Array.isArray(val)) return val;
                if (typeof val === 'string') {
                    try {
                        const parsed = JSON.parse(val);
                        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
                    } catch {
                        return {};
                    }
                }
                return {};
            };

            const jv = parseJsonObject(legal.jv_details);
            const devAg = parseJsonObject(legal.dev_agreement_details);
            const guidelineDocs = parseJsonArray(fin.guideline_reference_documents);
            const requiredLoanDocs = parseJsonArray(bankLoan.required_loan_documents);

            // Loan: bank_loan_approved DB default is false — only show 'Yes'/'No' if explicitly set
            // We treat: is_approved=true → 'Yes', is_approved=false AND banks/status set → 'No', else ''
            // bank_loan_approved is saved as explicit boolean — true=Yes, false=No
            // We only treat it as "not set" if the entire bank_loan block has no meaningful data
            const bankLoanHasData = bankLoan.is_approved === true ||
                                    bankLoan.loan_approval_status ||
                                    bankLoan.banks ||
                                    bankLoan.maximum_loan_percentage ||
                                    bankLoan.loan_approval_status === null; // explicitly saved as No
            // Check if bank_loan_approved was explicitly saved (backend returns false by default)
            // We distinguish "user picked No" vs "never touched" by checking if any related field exists
            // Since backend always returns bank_loan_approved, we rely on loan_approval_status or banks being set for Yes
            // For No: is_approved=false. For untouched: is_approved=false AND no other fields.
            // So: if is_approved=true → Yes. If is_approved=false AND guideline/ownership fields were saved (step5 was submitted) → No. Else ''
            const step5WasSubmitted = !!(fin.guideline_value || fin.guideline_value_unit || legal.ownership_type || fin.property_jurisdiction_area);
            const loanAvailableVal = bankLoan.is_approved === true ? 'Yes'
                : (bankLoan.is_approved === false && step5WasSubmitted) ? 'No'
                : '';
            const bankTieUpVal = bankLoan.banks ? 'Yes'
                : (bankLoan.bank_tie_up_available === true ? 'Yes'
                : (bankLoan.is_approved === true ? 'No' : ''));

            dispatch(updateStep5({
                // Brokerage
                brokerageAvailable:   brokerage.type && brokerage.type !== 'none' ? 'Yes' : 'No',
                brokeragePercentage:  brokerage.value ? String(brokerage.value) : '',
                brokerageTerms:       brokerage.terms || '',

                // Guideline
                guidelineValueAmount:       fin.guideline_value != null ? String(fin.guideline_value) : '',
                guidelineValueUnit:         fin.guideline_value_unit || '',
                propertyJurisdictionArea:   fin.property_jurisdiction_area || '',
                guidelineYear:              fin.guideline_year || '',
                guidelineReferenceDocuments: guidelineDocs,

                // Registry charges — if step5 was submitted and no charges saved, user picked "No"
                registryChargesAvailable:   (regCharges.male || regCharges.female || regCharges.other)
                    ? 'Yes'
                    : (step5WasSubmitted ? 'No' : ''),
                registryChargesMaleBuyer:   regCharges.male   ? String(regCharges.male)   : '',
                registryChargesFemaleBuyer: regCharges.female ? String(regCharges.female) : '',
                otherGovernmentCharges:     regCharges.other  ? String(regCharges.other)  : '',

                // Loan
                loanAvailable:          loanAvailableVal,
                bankTieUpAvailable:     bankTieUpVal,
                tieUpBankName:          Array.isArray(bankLoan.banks) ? bankLoan.banks.join(', ') : (bankLoan.banks || ''),
                bankNameList:           Array.isArray(bankLoan.banks) ? bankLoan.banks.join(', ') : (bankLoan.banks || ''),
                loanApprovalStatus:     bankLoan.loan_approval_status || '',
                maximumLoanPercentage:  bankLoan.maximum_loan_percentage ? String(bankLoan.maximum_loan_percentage) : '',
                requiredLoanDocuments:  requiredLoanDocs.join(', '),

                // Ownership
                ownershipType:              legal.ownership_type || '',
                ownedOwnerCompanyName:      legal.owned_owner_company_name || '',
                ownedDocuments:             parseJsonArray(legal.owned_documents),
                otherOwnershipType:         legal.other_ownership_type || '',
                ownershipSupportingDocuments: parseJsonArray(legal.ownership_supporting_documents),

                // JV
                jvLandOwnerName:            jv.land_owner || '',
                jvDeveloperBuilderName:     jv.developer || '',
                jvAgreementAvailable:       jv.agreement_available || '',
                jvAgreementDocuments:       parseJsonArray(jv.documents),
                jvRevenueAreaSharingDetails: jv.revenue_sharing || '',

                // Development Agreement
                developmentLandOwnerName:       devAg.land_owner || '',
                developmentDeveloperName:        devAg.developer || '',
                developmentAgreementAvailable:   devAg.agreement_available || '',
                developmentAgreementDocuments:   parseJsonArray(devAg.documents),

                // Title
                titleVerificationStatus:   legal.title_verification_status || '',
                titleVerificationDoneBy:   legal.title_verification_done_by || '',
                titleVerificationDate:     legal.title_verification_date || '',
                titleExpectedCompletionDate: legal.title_expected_completion_date || '',
                titleReportDocuments:      parseJsonArray(legal.title_report_documents),

                // Remarks
                financialOwnershipRemarks: legal.financial_ownership_remarks || '',

                // Incentives / settings / assignments / video
                customerIncentives: s5.incentives?.customer || '',
                brokerIncentives:   s5.incentives?.broker   || '',
                videoUrl:           s5.video_url || '',
                visibility:         s5.settings?.visibility || 'public',
                salesOfficerId:     s5.assignments?.sales_officer_id || null,
                branchManagerId:    s5.assignments?.branch_manager_id || null,
            }));

            // Navigate to resume_at_step from backend
            const resumeAt = resumeData.resume_at_step || 1;

            // Step 6 — restore already-uploaded media as images array
            const savedMedia = resumeData.step6?.media || [];
            dispatch(updateStep6({
                    images: savedMedia
                        .filter(m => m.media_type === 'image')
                        .map(m => ({ uri: m.url, key: m.key, isRemote: true })),
                    documents: savedMedia
                        .filter(m => m.media_type === 'document')
                        .map(m => ({ uri: m.url, key: m.key, name: m.label || 'Document', isRemote: true })),
                }));

            setTimeout(() => dispatch(setStep(Math.min(resumeAt, 6))), 100);

        } catch (e) {
            console.warn("Resume API failed, falling back to basic draft data", e);
            // Fallback: restore step1 from the draft list item and go to step 1
            dispatch(updateStep1({
                projectName: draft.name || '',
                location: draft.location || '',
                city: draft.city || '',
                state: draft.state || '',
                pincode: draft.pincode || '',
                latitude: draft.latitude ?? null,
                longitude: draft.longitude ?? null,
                salesOfficerName: draft.sales_officer_name || '',
                salesOfficerContact: draft.sales_officer_contact || '',
                responsiblePersonName: draft.responsible_person_name || '',
                responsiblePersonContact: draft.responsible_person_contact || '',
            }));
            const lastDone = draft.last_completed_step || 1;
            setTimeout(() => dispatch(setStep(Math.min(lastDone + 1, 6))), 100);
        }
    };

    useEffect(() => {
        scrollRef.current?.scrollToPosition?.(0, 0, false);
        scrollRef.current?.scrollTo?.({ y: 0, animated: false });
    }, [currentStep]);

    const validateStep1Fields = (values) => {
        const errors = {};

        if (!values.projectName || values.projectName.trim().length < 3) {
            errors.projectName = 'Project name must be at least 3 characters';
        }

        if (!values.location || values.location.trim().length === 0) {
            errors.location = 'Location is required';
        }

        if (!values.city || values.city.trim().length === 0) {
            errors.city = 'City is required';
        }

        if (!values.state || values.state.trim().length === 0) {
            errors.state = 'State is required';
        }

        if (!values.pincode || !/^[0-9]{6}$/.test(values.pincode.trim())) {
            errors.pincode = 'Enter a valid 6-digit pincode';
        }

        const nameValidator = (v) => v && v.trim().length >= 2;
        if (!nameValidator(values.salesOfficerName)) {
            errors.salesOfficerName = 'Enter sales officer name';
        }
        if (!/^[0-9]{10}$/.test((values.salesOfficerContact || '').trim())) {
            errors.salesOfficerContact = 'Enter a valid 10-digit contact number';
        }

        if (!nameValidator(values.responsiblePersonName)) {
            errors.responsiblePersonName = 'Enter responsible person name';
        }
        if (!/^[0-9]{10}$/.test((values.responsiblePersonContact || '').trim())) {
            errors.responsiblePersonContact = 'Enter a valid 10-digit contact number';
        }

        return { valid: Object.keys(errors).length === 0, errors };
    };

    const handleNext = async (opts) => {
        const saveOnly = opts?.save === true;
        // Record exactly which step to land on next time this draft is resumed:
        // the step just finished (Next) or the step the user stayed on (Save Draft) —
        // never silently skipped ahead, so "Continue draft" always returns them
        // to exactly where they stopped.
        const finishStep = async (nextStep, pid = projectId) => {
            const resumeStep = saveOnly ? currentStep : nextStep;
            if (pid) {
                try {
                    await projectFormApi.updateResumeStep(pid, resumeStep);
                } catch (error) {
                    console.log('[SAVE DRAFT] Failed to record resume step:', error);
                }
            }
            if (saveOnly) {
                alert('Draft saved.');
            } else {
                dispatch(setStep(nextStep));
            }
        };

        if (currentStep === 1) {
            const { valid, errors } = validateStep1Fields(step1);
            if (!valid) {
                setStep1Errors(errors);
                return;
            }
            setStep1Errors({});

            // If draft already created (user went back), skip re-creating
            if (projectId) {
                if (saveOnly) {
                    alert('This step is already saved.');
                } else {
                    dispatch(setStep(2));
                }
                return;
            }

            try {
                setIsSubmitting(true);
                const res = await projectFormApi.createDraft({
                    name: step1.projectName,
                    location: step1.location,
                    city: step1.city,
                    state: step1.state,
                    pincode: step1.pincode,
                    latitude: step1.latitude,
                    longitude: step1.longitude,
                    sales_officer_name: step1.salesOfficerName,
                    sales_officer_contact: step1.salesOfficerContact,
                    responsible_person_name: step1.responsiblePersonName,
                    responsible_person_contact: step1.responsiblePersonContact,
                });
                dispatch(setProjectId(res.data.data.project_id));
                await finishStep(2, res.data.data.project_id);
            } catch (error) {
                const msg = error.response?.data?.message || "Failed to save project. Please try again.";
                setStep1Errors({ api: msg });
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        if (currentStep === 2) {
            if (!projectId) {
                setStep1Errors({ api: "Project ID missing. Please go back to step 1." });
                return;
            }
            try {
                setIsSubmitting(true);
                const property_types = step2.selectedTypes.map(t => ({
                    main_type: t.mainType,
                    sub_type: t.subType,
                }));
                await projectFormApi.configurePropertyTypes(projectId, { property_types });
                await finishStep(3);
            } catch (error) {
                console.error("Step 2 API error:", error);
                const msg = error.response?.data?.message || "Failed to save property types. Please try again.";
                setStep1Errors({ api: msg });
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        if (currentStep === 3) {
            if (!projectId) {
                if (!saveOnly) dispatch(setStep(4));
                return;
            }
            try {
                setIsSubmitting(true);

                await Promise.all(
                    step2.selectedTypes.map(async (type) => {
                        const units = step3.unitConfigs[type.id] || [];
                        if (units.length === 0) return;

                        // If bulk mode — CSV already uploaded to server, skip variant/sync
                        const isBulk = step3.uploadModes?.[type.id] === 'bulk';
                        if (isBulk) return;

                        // Group units by unique variant key (bhk/officeType + area + price)
                        const variantMap = {};
                        units.forEach((unit) => {
                            const variantKey = `${unit.bhk || unit.officeType || 'standard'}_${unit.area}_${unit.price || '0'}`;
                            if (!variantMap[variantKey]) {
                                variantMap[variantKey] = { blueprint: unit, units: [] };
                            }
                            variantMap[variantKey].units.push(unit);
                        });

                        // Create one variant per unique combo, then sync its units
                        // Also grab builder section data to persist floors/unitsPerFloor
                        const builderSections = step3.builderData?.[type.id]?.sections || [];

                        await Promise.all(
                            Object.entries(variantMap).map(async ([, { blueprint, units: variantUnits }]) => {
                                // Find the section this blueprint belongs to for floor/unit counts
                                const section = builderSections.find(s => s.id === blueprint.sectionId) || builderSections[0];
                                const sectionFloors = section?.floors ?? section?.rows ?? section?.lanes ?? null;
                                const sectionUnitsPerFloor = section?.unitsPerFloor ?? section?.plotsPerRow ?? section?.villasPerLane ?? null;

                                const variantPayload = {
                                    category_type:    blueprint.bhk || blueprint.officeType || type.subType,
                                    variant_name:     blueprint.variantName || blueprint.bhk || blueprint.officeType || 'Standard',
                                    area_sqft:        parseFloat(blueprint.area) || 0,
                                    area_unit:        blueprint.areaUnit || 'Sq-ft',
                                    selling_price:    parseFloat((blueprint.price || '').toString().replace(/,/g, '')) || 0,
                                    property_type:    type.mainType,
                                    property_subtype: type.subType,
                                    listing_type:     'buy',
                                    images:           (blueprint.images || []).map(extractMediaKey).filter(Boolean),
                                    amenities:        (blueprint.amenities || []).filter(Boolean),
                                    extra_charges:    (blueprint.extraCharges || []).filter(e => e.title),
                                    brochure_url:     extractMediaKey(blueprint.brochure),
                                    floors:           sectionFloors,
                                    units_per_floor:  sectionUnitsPerFloor,
                                };

                                const variantRes = await projectFormApi.createVariant(projectId, variantPayload);
                                const variantId = variantRes.data.data.variant_id;

                                // Group this variant's units by block/tower
                                const blockMap = {};
                                variantUnits.forEach((unit) => {
                                    const blockName = unit.tower || 'Block A';
                                    if (!blockMap[blockName]) blockMap[blockName] = [];
                                    blockMap[blockName].push({
                                        variant_id: variantId,
                                        unit_number: unit.propertyNumber,
                                        floor: unit.floor || null,
                                    });
                                });

                                await Promise.all(
                                    Object.entries(blockMap).map(([block_name, blockUnits]) =>
                                        projectFormApi.syncGridUnits(projectId, {
                                            property_subtype: type.subType,
                                            block_name,
                                            units: blockUnits,
                                        })
                                    )
                                );
                            })
                        );
                    })
                );

                await finishStep(4);
            } catch (error) {
                console.error("Step 3 API error:", error);
                const msg = error.response?.data?.message || "Failed to save unit details. Please try again.";
                setStep1Errors({ api: msg });
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        if (currentStep < 6) {
            // Step 4 Next → call step4-finalize
            if (currentStep === 4) {
                if (!projectId) { if (!saveOnly) dispatch(setStep(5)); return; }
                try {
                    setIsSubmitting(true);

                    // referenceNumber/approvalDate/documents are always preserved
                    // regardless of the current status radio — switching an
                    // approval to "No"/"Not Applicable" after already uploading a
                    // document or filling in a reference number must never
                    // silently wipe that data out from under the user.
                    const buildApproval = (s, extra = {}) => {
                        const isApproved = s.status === 'Yes';
                        const isKnown = s.status === 'Yes' || s.status === 'No';
                        return {
                            is_approved: isApproved,
                            // Raw status string ("Yes" | "No" | "Not Applicable"), kept
                            // alongside is_approved so RERA/Building Permission's
                            // "Not Applicable" choice survives resume instead of being
                            // indistinguishable from "never touched".
                            status: s.status || null,
                            expected_time: (isKnown && !isApproved) ? (s.expectedTime || null) : null,
                            referenceNumber: s.referenceNumber || s.approvalNumber || s.permissionNumber || null,
                            approvalDate: s.approvalDate || s.registrationDate || s.permissionDate || null,
                            documents: s.documents || [],
                            ...extra,
                        };
                    };

                    const tncpApproval = buildApproval(step4.approvals.tncp);
                    const diversionApproval = buildApproval(step4.approvals.diversion);
                    const reraApproval = buildApproval(step4.approvals.rera, {
                        rera_id: step4.approvals.rera.registrationNumber || null,
                        reason_not_available: step4.approvals.rera.reasonNotAvailable || null,
                    });
                    const devPermApproval = buildApproval(step4.approvals.developmentPermission);
                    const municipalApproval = buildApproval(step4.approvals.buildingPermission);

                    // Always send all approvals — backend SQL expects all fields to be present
                    const approvals = {
                        tncp: tncpApproval,
                        diversion: diversionApproval,
                        rera: reraApproval,
                        developmentPermission: devPermApproval,
                        municipal: municipalApproval,
                    };
                    await projectFormApi.finalizeStep4(projectId, {
                        possession_status: step4.possessionStatus || null,
                        possession_remarks: step4.possessionRemarks || null,
                        expected_possession_date: step4.expectedPossessionDate || null,
                        project_launch_status: step4.projectLaunchStatus || null,
                        project_launch_date: step4.projectLaunchDate || null,
                        expected_launch_date: step4.expectedLaunchDate || null,
                        development_progress: parseInt(step4.developmentCompletionPercentage) || 0,
                        development_checklist: step4.currentDevelopmentStage || [],
                        development_remarks: step4.developmentRemarks || null,
                        other_development_stage: step4.otherDevelopmentStage || null,
                        overall_approval_status: step4.overallApprovalStatus || null,
                        variant_possessions: [],
                        amenity_ids: [],
                        bank_account: null,
                        approvals,
                    });
                    await finishStep(5);
                } catch (error) {
                    console.error("Step 4 API error:", error);
                    const msg = error.response?.data?.message || "Failed to save approvals. Please try again.";
                    setStep1Errors({ api: msg });
                } finally {
                    setIsSubmitting(false);
                }
                return;
            }

            // Step 5 Next → call step5-finalize
            if (currentStep === 5) {
                if (!projectId) { if (!saveOnly) dispatch(setStep(6)); return; }
                try {
                    setIsSubmitting(true);
                    await projectFormApi.finalizeStep5(projectId, {
                        brokerage: {
                            type:  step5.brokerageAvailable === 'Yes' ? 'percentage' : 'none',
                            value: step5.brokerageAvailable === 'Yes' ? (parseFloat(step5.brokeragePercentage) || 0) : 0,
                            terms: step5.brokerageTerms || null,
                        },
                        incentives: { customer: step5.customerIncentives || null, broker: step5.brokerIncentives || null },
                        settings: { visibility: step5.visibility || 'public' },
                        assignments: { sales_officer_id: step5.salesOfficerId || null, branch_manager_id: step5.branchManagerId || null },
                        video_url: step5.videoUrl || null,
                        financial_details: {
                            guideline_value:               step5.guidelineValueAmount ? parseFloat(step5.guidelineValueAmount) || null : null,
                            guideline_value_unit:          step5.guidelineValueUnit || null,
                            property_jurisdiction_area:    step5.propertyJurisdictionArea || null,
                            guideline_year:                step5.guidelineYear || null,
                            guideline_reference_documents: step5.guidelineReferenceDocuments || [],
                            registry_charges: step5.registryChargesAvailable === 'Yes'
                                ? {
                                    male:   step5.registryChargesMaleBuyer    || null,
                                    female: step5.registryChargesFemaleBuyer  || null,
                                    other:  step5.otherGovernmentCharges      || null,
                                }
                                : null,
                            bank_loan: {
                                is_approved:                step5.loanAvailable === 'Yes',
                                bank_tie_up_available:      step5.bankTieUpAvailable === 'Yes',
                                banks:                      step5.bankTieUpAvailable === 'Yes' ? (step5.tieUpBankName || step5.bankNameList || null) : null,
                                loan_approval_status:       step5.loanApprovalStatus || null,
                                maximum_loan_percentage:    step5.maximumLoanPercentage || null,
                                required_loan_documents:    step5.requiredLoanDocuments
                                    ? step5.requiredLoanDocuments.split(',').map(d => d.trim()).filter(Boolean)
                                    : [],
                            },
                        },
                        legal_details: {
                            ownership_type:             step5.ownershipType || null,
                            owned_owner_company_name:   step5.ownedOwnerCompanyName || null,
                            owned_documents:            step5.ownedDocuments || [],
                            other_ownership_type:       step5.otherOwnershipType || null,
                            ownership_supporting_documents: step5.ownershipSupportingDocuments || [],
                            jv_details: step5.ownershipType === 'Joint Venture Project'
                                ? {
                                    land_owner:          step5.jvLandOwnerName || null,
                                    developer:           step5.jvDeveloperBuilderName || null,
                                    agreement_available: step5.jvAgreementAvailable || null,
                                    revenue_sharing:     step5.jvRevenueAreaSharingDetails || null,
                                    documents:           step5.jvAgreementDocuments || [],
                                }
                                : null,
                            dev_agreement_details: step5.ownershipType === 'Development Agreement Project'
                                ? {
                                    land_owner:          step5.developmentLandOwnerName || null,
                                    developer:           step5.developmentDeveloperName || null,
                                    agreement_available: step5.developmentAgreementAvailable || null,
                                    documents:           step5.developmentAgreementDocuments || [],
                                }
                                : null,
                            title_verification_status:   step5.titleVerificationStatus || null,
                            title_verification_done_by:  step5.titleVerificationDoneBy || null,
                            title_verification_date:     step5.titleVerificationDate || null,
                            title_expected_completion_date: step5.titleExpectedCompletionDate || null,
                            title_report_documents:      step5.titleReportDocuments || [],
                            financial_ownership_remarks: step5.financialOwnershipRemarks || null,
                        },
                    });
                    await finishStep(6);
                } catch (error) {
                    console.error("Step 5 API error:", error);
                    // Non-blocking — proceed to step 6 (unless the user only asked to save)
                    if (saveOnly) {
                        alert('Some Step 5 details failed to save. Please try again.');
                    } else {
                        dispatch(setStep(6));
                    }
                } finally {
                    setIsSubmitting(false);
                }
                return;
            }

            if (!saveOnly) dispatch(setStep(currentStep + 1));
        } else {
            // Step 6 Submit → upload images then call step6-finalize
            if (!projectId) {
                setStep1Errors({ api: "Project ID missing. Cannot submit." });
                return;
            }

            try {
                setIsSubmitting(true);

                // Upload each new image/document to S3 and collect the returned
                // permanent file keys. Items restored from a resumed draft are
                // already uploaded (isRemote + key set) and are reused as-is —
                // never re-sent as their temporary signed preview URL.
                const mediaItems = [];
                for (let i = 0; i < step6.images.length; i++) {
                    const img = step6.images[i];
                    if (img.isRemote && img.key) {
                        mediaItems.push({ media_type: 'image', url: img.key, is_cover: i === 0, sort_order: i });
                        continue;
                    }
                    const formData = new FormData();
                    formData.append('file', {
                        uri: img.uri,
                        name: img.fileName || `image_${i}.jpg`,
                        type: img.mimeType || 'image/jpeg',
                    });
                    const uploadRes = await projectFormApi.uploadMedia(projectId, formData);
                    const key = uploadRes.data?.data?.key;
                    if (key) {
                        mediaItems.push({ media_type: 'image', url: key, is_cover: i === 0, sort_order: i });
                    }
                }

                for (let i = 0; i < (step6.documents || []).length; i++) {
                    const doc = step6.documents[i];
                    const sortOrder = step6.images.length + i;
                    if (doc.isRemote && doc.key) {
                        mediaItems.push({
                            media_type: 'document',
                            url: doc.key,
                            label: doc.name || null,
                            is_cover: false,
                            sort_order: sortOrder,
                        });
                        continue;
                    }
                    const formData = new FormData();
                    formData.append('file', {
                        uri: doc.uri,
                        name: doc.name || `document_${i}.pdf`,
                        type: doc.mimeType || 'application/pdf',
                    });
                    const uploadRes = await projectFormApi.uploadMedia(projectId, formData);
                    const key = uploadRes.data?.data?.key;
                    if (key) {
                        mediaItems.push({
                            media_type: 'document',
                            url: key,
                            label: doc.name || null,
                            is_cover: false,
                            sort_order: sortOrder,
                        });
                    }
                }

                // Saving a draft on Step 6 syncs the media as-is without
                // publishing (status stays draft/in-progress); only the real
                // Submit action flips the project to active.
                await projectFormApi.finalizeStep6(projectId, {
                    media: mediaItems,
                    publish: !saveOnly,
                });

                if (saveOnly) {
                    alert('Draft saved.');
                    return;
                }

                dispatch(addProject({
                    id: projectId,
                    ...step1,
                    status: 'Active',
                    createdAt: new Date().toISOString(),
                }));
                dispatch(addNotification({
                    title: "Project added successfully",
                    description: `${step1.projectName || "New project"} has been added to your project panel.`,
                    type: "success",
                }));
                dispatch(resetForm());
                router.push('/success');
            } catch (error) {
                console.error("Submit error:", error);
                const msg = error.response?.data?.message || "Failed to submit project. Please try again.";
                setStep1Errors({ api: msg });
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const isNextDisabled = () => {
        if (currentStep === 1) {
            return !validateStep1Fields(step1).valid;
        }

        if (currentStep === 2) {
            return step2.selectedTypes.length === 0;
        }

        if (currentStep === 3) {
            if (step2.selectedTypes.length === 0) return true;
            
            // Check if all selected types have at least one unit and all units are filled
            return step2.selectedTypes.some(type => {
                const configs = step3.unitConfigs[type.id] || [];
                if (configs.length === 0) return true;
                
                return configs.some(unit => {
                    const priceValue = parseFloat(String(unit.price || '').replace(/,/g, ''));
                    const baseFields = !unit.area || !unit.propertyNumber || !unit.price || !(priceValue > 0);
                    if (baseFields) return true;

                    if (type.subType === 'apartment') {
                        if (!unit.tower || !unit.floor || !unit.bhk) return true;
                    }
                    if (type.subType === 'villa' || type.subType === 'rowhouse') {
                        if (!unit.bhk) return true;
                    }
                    if (type.subType === 'office') {
                        if (!unit.officeType) return true;
                    }
                    return false;
                });
            });
        }

        if (currentStep === 4) {
            const percentage = Number(step4.developmentCompletionPercentage);
            if (step4.possessionStatus === "Possession Pending" && !step4.expectedPossessionDate) return true;
            if (step4.projectLaunchStatus === "Already Launched" && !step4.projectLaunchDate) return true;
            if (step4.projectLaunchStatus === "Upcoming Launch" && !step4.expectedLaunchDate) return true;
            if (step4.developmentCompletionPercentage !== '' && (Number.isNaN(percentage) || percentage < 0 || percentage > 100)) return true;
            if (step4.approvals.rera.status === "Yes" && !step4.approvals.rera.registrationNumber) return true;
            if (step4.approvals.buildingPermission.status === "No" && !step4.approvals.buildingPermission.expectedTime) return true;
            if (step4.approvals.developmentPermission.status === "No" && !step4.approvals.developmentPermission.expectedTime) return true;
            return false;
        }

        if (currentStep === 5) {
            if (step5.guidelineValueAmount && !step5.guidelineValueUnit) return true;
            if (step5.guidelineValueUnit && !step5.guidelineValueAmount) return true;
            if (step5.loanAvailable === "Yes" && (!step5.bankTieUpAvailable || !step5.loanApprovalStatus || !(step5.tieUpBankName || step5.bankNameList))) return true;
            if (step5.ownershipType === "Joint Venture Project" && (!step5.jvLandOwnerName || !step5.jvDeveloperBuilderName)) return true;
            return false;
        }

        if (currentStep === 6) {
            return step6.images.length < 3 || !step6.agreed;
        }

        return false;
    };

    const handleBack = () => {
        if (currentStep > 1) {
            dispatch(setStep(currentStep - 1));
        } else {
            router.back();
        }
    };

    return (
        <>
        <View className="flex-1 bg-[#F8F9FE]">
                <StatusBar barStyle="light-content" />

                    {/* Header Section */}
                    <View className="bg-[#4A43EC] pt-12 pb-8 px-5 relative overflow-hidden">
                        {/* Decorative Circle */}
                        <View
                            style={{
                                position: "absolute",
                                right: -width * 0.5,
                                top: -width * 0.25,
                                width: width * 0.85,
                                height: width * 0.85,
                                borderRadius: width * 0.4,
                                backgroundColor: "#3D36C7",
                                opacity: 0.5
                            }}
                        />

                        <View className="flex-row items-center mt-6 justify-between mb-8">
                            <TouchableOpacity onPress={handleBack} className="p-1">
                                <Ionicons name="arrow-back" size={20} color="white" />
                            </TouchableOpacity>
                            <Text className="text-white text-base font-lato-bold">Add Project</Text>
                            <View className="flex-row items-center gap-2">
                                <TouchableOpacity
                                    onPress={() => handleNext({ save: true })}
                                    disabled={isSubmitting}
                                    className="flex-row items-center gap-1 px-2 py-1 rounded-lg bg-white/20"
                                    style={{ opacity: isSubmitting ? 0.5 : 1 }}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Ionicons name="save-outline" size={14} color="white" />
                                    )}
                                    <Text className="text-white text-xs font-lato-bold">Save</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={openDrafts} className="flex-row items-center gap-1 px-2 py-1 rounded-lg bg-white/20">
                                    <Ionicons name="document-text-outline" size={14} color="white" />
                                    <Text className="text-white text-xs font-lato-bold">Drafts</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Step Indicator — a completed (earlier) step can be tapped to
                            jump straight back to it; the current/upcoming steps can't,
                            since those still need their own data filled in first. */}
                        <View className="flex-row justify-between items-start mt-8">
                            {steps.map((step) => {
                                const isPast = step.id < currentStep;
                                return (
                                    <TouchableOpacity
                                        key={step.id}
                                        disabled={!isPast}
                                        onPress={() => dispatch(setStep(step.id))}
                                        activeOpacity={isPast ? 0.6 : 1}
                                        className="items-center"
                                        style={{ width: (width - 40) / 6 }}
                                    >
                                        <View
                                            className={`w-7 h-7 rounded-full items-center justify-center mb-1.5 ${currentStep === step.id ? 'bg-white' : isPast ? 'bg-white/25 border border-white/70' : 'bg-transparent border border-white/40'
                                                }`}
                                        >
                                            {isPast ? (
                                                <Ionicons name="checkmark" size={14} color="white" />
                                            ) : (
                                                <Text className={`text-xs font-lato-bold ${currentStep === step.id ? 'text-[#4A43EC]' : 'text-white/60'
                                                    }`}>
                                                    {step.id}
                                                </Text>
                                            )}
                                        </View>
                                        <Text className={`text-[8px] text-center font-lato-medium ${currentStep === step.id ? 'text-white' : isPast ? 'text-white/90' : 'text-white/60'
                                            }`} numberOfLines={1}>
                                            {step.title}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Content Section */}
                    <View className="flex-1 bg-white -mt-5 rounded-t-[20px] overflow-hidden">
                        <KeyboardAwareScrollView
                            innerRef={(ref) => {
                                scrollRef.current = ref;
                            }}
                            className="flex-1 px-5 pt-6"
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{
                                paddingBottom: Platform.OS === "android" ? ANDROID_CONTENT_BOTTOM_PADDING : IOS_CONTENT_BOTTOM_PADDING,
                                flexGrow: 1,
                            }}
                            keyboardShouldPersistTaps="always"
                            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                            enableOnAndroid
                            extraScrollHeight={Platform.OS === "android" ? ANDROID_KEYBOARD_EXTRA_SCROLL : IOS_KEYBOARD_EXTRA_SCROLL}
                            extraHeight={Platform.OS === "android" ? ANDROID_KEYBOARD_EXTRA_HEIGHT : IOS_KEYBOARD_EXTRA_HEIGHT}
                            viewIsInsideTabBar={Platform.OS === "android"}
                            enableAutomaticScroll
                            keyboardOpeningTime={Platform.OS === "android" ? 0 : 250}
                            enableResetScrollToCoords={false}
                            nestedScrollEnabled={Platform.OS === "android"}
                        >
                            <View>
                                {currentStep === 1 && <Step1 errors={step1Errors} setErrors={setStep1Errors} />}
                                {currentStep === 2 && <Step2 />}
                                {currentStep === 3 && <Step3 />}
                                {currentStep === 4 && <Step4 />}
                                {currentStep === 5 && <Step5 />}
                                {currentStep === 6 && <Step6 />}

                                {/* Next Button */}
                                <View className="mt-8 mb-4">
                                    <TouchableOpacity
                                        className={`py-4 rounded-xl items-center ${isNextDisabled() || isSubmitting ? 'bg-gray-300' : 'bg-[#4A43EC]'}`}
                                        activeOpacity={0.8}
                                        onPress={handleNext}
                                        disabled={isNextDisabled() || isSubmitting}
                                    >
                                        <Text className="text-white text-sm font-lato-bold">
                                            {isSubmitting ? "Please wait..." : currentStep === 6 ? "Submit" : "Next"}
                                        </Text>
                                    </TouchableOpacity>
                                    {step1Errors.api && (
                                        <Text className="text-[11px] text-red-500 mt-2 text-center">{step1Errors.api}</Text>
                                    )}
                                </View>
                            </View>
                        </KeyboardAwareScrollView>
                    </View>
                </View>

        

            {/* Drafts Modal */}
            <Modal visible={draftsVisible} animationType="slide" transparent onRequestClose={() => setDraftsVisible(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%' }}>
                        <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
                            <Text className="text-base font-lato-bold text-gray-900">Incomplete Drafts</Text>
                            <TouchableOpacity onPress={() => setDraftsVisible(false)}>
                                <Ionicons name="close" size={22} color="#374151" />
                            </TouchableOpacity>
                        </View>
                        {draftsLoading ? (
                            <View className="items-center justify-center py-12">
                                <ActivityIndicator size="large" color="#4A43EC" />
                            </View>
                        ) : drafts.length === 0 ? (
                            <View className="items-center justify-center py-12">
                                <Ionicons name="document-outline" size={40} color="#D1D5DB" />
                                <Text className="text-gray-400 mt-3 font-lato-medium">No drafts found</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={drafts}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={{ padding: 16, gap: 10 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        onPress={() => resumeDraft(item)}
                                        style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' }}
                                    >
                                        <View className="flex-row items-center justify-between">
                                            <View style={{ flex: 1 }}>
                                                <Text className="text-sm font-lato-bold text-gray-900" numberOfLines={1}>{item.name}</Text>
                                                <Text className="text-xs text-gray-500 mt-0.5 font-lato-medium">{item.city}{item.city && item.location ? ', ' : ''}{item.location}</Text>
                                                <Text className="text-[10px] text-gray-400 mt-1">
                                                    Last updated: {new Date(item.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </Text>
                                            </View>
                                            <View className="flex-row items-center gap-1 ml-3">
                                                <Text className="text-xs text-[#4A43EC] font-lato-bold">Resume</Text>
                                                <Ionicons name="arrow-forward" size={14} color="#4A43EC" />
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </>
    );
}

// --- Step 1 Component ---
function Step1({ errors = {}, setErrors }) {
    const dispatch = useDispatch();
    const { step1 } = useSelector((state) => state.project);
    const [mapPickerVisible, setMapPickerVisible] = useState(false);

    const updateField = (field, value) => {
        dispatch(updateStep1({ [field]: value }));
        if (setErrors) {
            setErrors(prev => {
                if (!prev) return {};
                const copy = { ...prev };
                delete copy[field];
                return copy;
            });
        }
    };

    const confirmMapAddress = (address) => {
        dispatch(updateStep1({
            location: address.location,
            city: address.city || step1.city,
            state: address.state || step1.state,
            pincode: address.pincode || step1.pincode,
            latitude: address.latitude,
            longitude: address.longitude,
        }));
        setErrors?.((previous) => ({ ...(previous || {}), location: undefined }));
        setMapPickerVisible(false);
    };
    const projectNameRef = useRef(null);
    const locationRef = useRef(null);
    const cityRef = useRef(null);
    const stateRef = useRef(null);
    const pincodeRef = useRef(null);
    const salesNameRef = useRef(null);
    const salesContactRef = useRef(null);
    const respNameRef = useRef(null);
    const respContactRef = useRef(null);


    return (
        <View className="gap-6">
            {/* Project Name */}
            <View>
                <Text className="text-xs font-lato-bold text-black mb-1.5">Project Name</Text>
                <Pressable onPress={() => projectNameRef.current?.focus()} className="bg-white border border-gray-200 rounded-xl px-4 h-12 flex-row items-center">
                    <TextInput
                        ref={projectNameRef}
                        className="flex-1 text-[13px] text-gray-800 font-lato-medium"
                        placeholder="eg. The Grand Residency"
                        placeholderTextColor="#9CA3AF"
                        value={step1.projectName}
                        onChangeText={(v) => updateField('projectName', v)}
                        style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                    />
                </Pressable>
                {errors.projectName && (
                    <Text className="text-[11px] text-red-500 mt-1">{errors.projectName}</Text>
                )}
            </View>

            {/* Location */}
            <View>
                <Text className="text-xs font-lato-bold text-black mb-1.5">Location</Text>
                <Pressable onPress={() => locationRef.current?.focus()} className="bg-white border border-gray-200 rounded-xl px-4 h-12 flex-row items-center">
                    <TextInput
                        ref={locationRef}
                        className="flex-1 text-[13px] text-gray-800 font-lato-medium"
                        placeholder="Address & Landmark"
                        placeholderTextColor="#9CA3AF"
                        value={step1.location}
                        onChangeText={(v) => updateField('location', v)}
                        style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                    />
                    <TouchableOpacity
                        onPress={() => { Keyboard.dismiss(); setMapPickerVisible(true); }}
                        className="w-7 h-7 rounded-lg bg-[#EBEAFF] items-center justify-center"
                    >
                        <Ionicons name="map-outline" size={16} color="#4A43EC" />
                    </TouchableOpacity>
                </Pressable>
                {errors.location && (
                    <Text className="text-[11px] text-red-500 mt-1">{errors.location}</Text>
                )}
                <LocationMapPicker
                    visible={mapPickerVisible}
                    initialAddress={step1}
                    onClose={() => setMapPickerVisible(false)}
                    onConfirm={confirmMapAddress}
                    confirmLabel="Add this address"
                />
            </View>

            {/* City, State, Pincode */}
            <View className="flex-row gap-3">
                <View className="flex-1">
                    <Text className="text-xs font-lato-bold text-black mb-1.5">City</Text>
                    <Pressable onPress={() => cityRef.current?.focus()} className="bg-white border border-gray-200 rounded-xl px-4 h-12 justify-center">
                        <TextInput
                            ref={cityRef}
                            className="text-[13px] text-gray-800 font-lato-medium"
                            placeholder="city"
                            placeholderTextColor="#9CA3AF"
                            value={step1.city}
                            onChangeText={(v) => updateField('city', v)}
                            style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                        />
                    </Pressable>
                    {errors.city && (
                        <Text className="text-[11px] text-red-500 mt-1">{errors.city}</Text>
                    )}
                </View>
                <View className="flex-1">
                    <Text className="text-xs font-lato-bold text-black mb-1.5">State</Text>
                    <Pressable onPress={() => stateRef.current?.focus()} className="bg-white border border-gray-200 rounded-xl px-4 h-12 justify-center">
                        <TextInput
                            ref={stateRef}
                            className="text-[13px] text-gray-800 font-lato-medium"
                            placeholder="state"
                            placeholderTextColor="#9CA3AF"
                            value={step1.state}
                            onChangeText={(v) => updateField('state', v)}
                            style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                        />
                    </Pressable>
                    {errors.state && (
                        <Text className="text-[11px] text-red-500 mt-1">{errors.state}</Text>
                    )}
                </View>
                <View className="flex-1">
                    <Text className="text-xs font-lato-bold text-black mb-1.5">Pincode</Text>
                    <Pressable onPress={() => pincodeRef.current?.focus()} className="bg-white border border-gray-200 rounded-xl px-4 h-12 justify-center">
                        <TextInput
                            ref={pincodeRef}
                            className="text-[13px] text-gray-800 font-lato-medium"
                            placeholder="pincode"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            value={step1.pincode}
                            onChangeText={(v) => updateField('pincode', v)}
                            style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                        />
                    </Pressable>
                    {errors.pincode && (
                        <Text className="text-[11px] text-red-500 mt-1">{errors.pincode}</Text>
                    )}
                </View>
            </View>

            {/* Sales Officer Section */}
            <View>
                <Text className="text-xs font-lato-bold text-black mb-1.5">Sales officer name</Text>
                <Pressable onPress={() => salesNameRef.current?.focus()} className="bg-white border border-gray-200 rounded-xl px-4 h-12 flex-row items-center">
                    <TextInput
                        ref={salesNameRef}
                        className="flex-1 text-[13px] text-gray-800 font-lato-medium"
                        placeholder="eg. manas gangrade"
                        placeholderTextColor="#9CA3AF"
                        value={step1.salesOfficerName}
                        onChangeText={(v) => updateField('salesOfficerName', v)}
                        style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                    />
                    <View className="w-7 h-7 rounded-lg bg-[#EBEAFF] items-center justify-center">
                        <Ionicons name="person" size={16} color="#4A43EC" />
                    </View>
                </Pressable>
                {errors.salesOfficerName && (
                    <Text className="text-[11px] text-red-500 mt-1">{errors.salesOfficerName}</Text>
                )}
            </View>

            <View>
                <Text className="text-xs font-lato-bold text-black mb-1.5">Contact No.</Text>
                <Pressable onPress={() => salesContactRef.current?.focus()} className="flex-row bg-white border border-gray-200 rounded-xl px-4 h-12 items-center">
                    <TextInput
                        ref={salesContactRef}
                        className="flex-1 text-[13px] text-gray-800 font-lato-medium"
                        placeholder="eg. 8120180101"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="phone-pad"
                        value={step1.salesOfficerContact}
                        onChangeText={(v) => updateField('salesOfficerContact', v)}
                        style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                    />
                </Pressable>
                {errors.salesOfficerContact && (
                    <Text className="text-[11px] text-red-500 mt-1">{errors.salesOfficerContact}</Text>
                )}
            </View>
            

            {/* Responsible Person Section */}
            <View>
                <Text className="text-xs font-lato-bold text-black mb-1.5">Responsible person name</Text>
                <Pressable onPress={() => respNameRef.current?.focus()} className="bg-white border border-gray-200 rounded-xl px-4 h-12 justify-center">
                    <TextInput
                        ref={respNameRef}
                        className="text-[13px] text-gray-800 font-lato-medium"
                        placeholder="eg. manas gangrade"
                        placeholderTextColor="#9CA3AF"
                        value={step1.responsiblePersonName}
                        onChangeText={(v) => updateField('responsiblePersonName', v)}
                        style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                    />
                </Pressable>
                {errors.responsiblePersonName && (
                    <Text className="text-[11px] text-red-500 mt-1">{errors.responsiblePersonName}</Text>
                )}
            </View>

            <View>
                <Text className="text-xs font-lato-bold text-black mb-1.5">Contact No.</Text>
                <Pressable onPress={() => respContactRef.current?.focus()} className="flex-row bg-white border border-gray-200 rounded-xl px-4 h-12 items-center">
                    <TextInput
                        ref={respContactRef}
                        className="flex-1 text-[13px] text-gray-800 font-lato-medium"
                        placeholder="eg. 8120180101"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="phone-pad"
                        value={step1.responsiblePersonContact}
                        onChangeText={(v) => updateField('responsiblePersonContact', v)}
                        style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                    />
                </Pressable>
                {errors.responsiblePersonContact && (
                    <Text className="text-[11px] text-red-500 mt-1">{errors.responsiblePersonContact}</Text>
                )}
            </View>
            
        </View>
    );
}

// --- CSV Helper ---
const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = lines.slice(1).map(line => {
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = values[i];
        });
        return obj;
    });
    return data;
};

// --- Step 2 Component ---
function Step2() {
    const { width } = Dimensions.get('window');
    const dispatch = useDispatch();
    const { step2 } = useSelector((state) => state.project);
    const [showUnitDropdown, setShowUnitDropdown] = useState(false);

    const towerRef = useRef(null);
    const floorRef = useRef(null);
    const areaRef = useRef(null);
    const propertyNumberRef = useRef(null);

    // Local state for the current type being added
    const [currentConfig, setCurrentConfig] = useState({
        id: '',
        mainType: null,
        subType: null,
        tower: '',
        floor: '',
        bhk: '',
        officeType: '',
        area: '',
        areaUnit: 'Sq-ft',
        amenities: [''],
        propertyNumber: '',
        hasShop: false,
        extraCharges: [{ title: '', amount: '' }]
    });

    const resetCurrentConfig = () => {
        setCurrentConfig({
            id: '',
            mainType: null,
            subType: null,
            tower: '',
            floor: '',
            bhk: '',
            officeType: '',
            area: '',
            areaUnit: 'Sq-ft',
            amenities: [''],
            propertyNumber: '',
            hasShop: false,
            extraCharges: [{ title: '', amount: '' }]
        });
    };

    const handleAddType = () => {
        if (!currentConfig.mainType || !currentConfig.subType) return;
        
        // Check if already added
        const exists = step2.selectedTypes.find(t => t.mainType === currentConfig.mainType && t.subType === currentConfig.subType);
        if (exists) return;

        dispatch(addPropertyType({
            mainType: currentConfig.mainType,
            subType: currentConfig.subType,
            id: Date.now().toString(),
        }));
        resetCurrentConfig();
    };

    const handleRemoveType = (id) => {
        dispatch(removePropertyType(id));
    };

    const subTypes = currentConfig.mainType ? subTypesData[currentConfig.mainType] : [];

    return (
        <View className="gap-5">
            <Text className="text-base font-lato-bold text-black">Configure Property Types</Text>

            {/* Added Types List */}
            {step2.selectedTypes.length > 0 && (
                <View className="gap-3">
                    {step2.selectedTypes.map((item) => {
                        const typeIcon = subTypesData[item.mainType]?.find(t => t.id === item.subType)?.image;
                        return (
                            <View key={item.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex-row justify-between items-center shadow-sm mb-3">
                                <View className="flex-row items-center flex-1">
                                    <View className="w-18 h-18 bg-[#F4F7FF] rounded-2xl items-center justify-center mr-4">
                                        <Image source={typeIcon} className="w-14 h-14" resizeMode="contain" />
                                    </View>
                                    <View className="justify-center">
                                        <Text className="font-lato-bold text-black text-[13px] leading-tight">
                                            {item.subType.toUpperCase()}
                                        </Text>
                                        <Text className="text-[11px] text-[#4A43EC] font-lato-bold uppercase mt-0.5 leading-tight">
                                            {item.mainType}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => handleRemoveType(item.id)} className="ml-4">
                                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </View>
            )}

            <View className="h-[1px] bg-gray-100 my-2" />

            {/* Main Property Type Selection */}
            <Text className="text-xs font-lato-bold text-black">Select Main Type</Text>
            <View className="flex-row justify-between">
                {mainTypes.map((type) => (
                    <TouchableOpacity
                        key={type.id}
                        onPress={() => setCurrentConfig(prev => ({ ...prev, mainType: type.id, subType: null }))}
                        style={{ width: (width - 50) / 2 }}
                        className={`bg-white rounded-xl h-24 border ${currentConfig.mainType === type.id ? 'border-[#4A43EC] bg-[#F4F7FF]' : 'border-gray-100'
                            } shadow-sm relative overflow-hidden`}
                    >
                        <Text className="text-[10px] font-lato-bold text-black absolute top-2 left-2.5 z-10">{type.label}</Text>
                        <View className="flex-1 justify-end items-end">
                            <Image source={type.image} className="w-[80%] h-[70%] mt-auto" resizeMode="contain" />
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Sub Type Selection */}
            {currentConfig.mainType && (
                <>
                    <View className="flex-row justify-between items-center">
                        <Text className="text-sm font-lato-bold text-black">Select Sub Type</Text>
                        {currentConfig.subType && (
                            <TouchableOpacity 
                                onPress={handleAddType}
                                className="bg-[#4A43EC] px-4 py-1.5 rounded-full"
                            >
                                <Text className="text-white text-[10px] font-lato-bold">Add This Type</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
                        {subTypes.map((type) => (
                            <TouchableOpacity
                                key={type.id}
                                onPress={() => setCurrentConfig(prev => ({ ...prev, subType: type.id }))}
                                style={{ width: width * 0.22 }}
                                className={`bg-white rounded-lg h-20 border mr-3 ${currentConfig.subType === type.id ? 'border-[#4A43EC] bg-[#F4F7FF]' : 'border-gray-100'
                                    } shadow-sm items-center overflow-hidden`}
                            >
                                <Text className={`text-[9px] font-lato-bold mt-1.5 mb-0.5 ${currentConfig.subType === type.id ? 'text-[#4A43EC]' : 'text-black'}`}>{type.label}</Text>
                                <Image source={type.image} className="w-full h-[60%]" resizeMode="contain" />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </>
            )}
        </View>
    );
}

// --- Project Engine Helper ---
const getDefaultBuilderState = (subType) => {
    let secName = 'Tower A';
    let rCount = 8;
    let cCount = 4;

    if (RANGE_BASED_SUB_TYPES.has(subType)) {
        secName = 'A';
        rCount = 1;
        cCount = 4;
    } else if (subType === 'apartment') {
        secName = 'Tower A';
        rCount = 8;
        cCount = 4;
    } else {
        secName = 'Section 1';
        rCount = 4;
        cCount = 6;
    }

    return {
        sections: [
            {
                id: 1,
                name: secName,
                floors: rCount,
                rows: rCount,
                lanes: rCount,
                unitsPerFloor: cCount,
                plotsPerRow: cCount,
                villasPerLane: cCount,
                configs: [], // No variants by default
                unitMap: {}, // No units assigned by default
                rowUnitCounts: {},
                unitOverrides: {}
            }
        ],
        activeSectionId: 1,
        activeConfigId: null, // No active config by default
        gridMode: 'paint', // 'paint' | 'edit'
        selectedUnitKey: null
    };
};

const normalizeImageSource = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? { uri: trimmed } : null;
    }
    if (typeof value === 'object') {
        if (typeof value.uri === 'string' && value.uri.trim()) {
            return { uri: value.uri.trim() };
        }
        if (typeof value.url === 'string' && value.url.trim()) {
            return { uri: value.url.trim() };
        }
        if (typeof value.path === 'string' && value.path.trim()) {
            return { uri: value.path.trim() };
        }
    }
    return null;
};

// Resumed variant images come back from the backend as [{key, url, is_cover}]
// where `url` is a temporary signed preview and `key` is the permanent S3
// object key. Keep both: `uri` renders the thumbnail, `key` is what actually
// gets re-sent to the backend on save (never the temporary signed url).
const mapResumedVariantImages = (images) => {
    if (!Array.isArray(images)) return [];
    return images
        .filter((img) => img && img.key)
        .map((img) => ({ uri: img.url, key: img.key }));
};

const mapResumedBrochure = (brochure) => {
    if (!brochure || !brochure.key) return null;
    return { uri: brochure.url, name: 'Brochure', mimeType: '', size: 0, key: brochure.key };
};

// A variant's `images`/`brochure` items are either a freshly-uploaded
// { uri, key } object or (legacy data) a bare key string — always resolve to
// the permanent key string the backend expects, never a local/preview uri.
const extractMediaKey = (item) => {
    if (!item) return null;
    if (typeof item === 'string') return item;
    return item.key || null;
};

// Uploads one picked asset to S3 via the project-media endpoint and returns
// the permanent key. Throws on failure — callers decide how to surface it.
const uploadAssetToServer = async (projectId, asset, mediaType) => {
    const formData = new FormData();
    formData.append('file', {
        uri: asset.uri,
        name: asset.name || asset.fileName || `${mediaType}_${Date.now()}`,
        type: asset.mimeType || asset.type || (mediaType === 'image' ? 'image/jpeg' : 'application/pdf'),
    });
    formData.append('media_type', mediaType);
    const res = await projectFormApi.uploadMedia(projectId, formData);
    return res.data?.data?.key || null;
};

// --- Step 3 Component ---
function Step3() {
    const dispatch = useDispatch();
    const { step2, step3 } = useSelector((state) => state.project);
    const projectId = useSelector((state) => state.project.projectId);
    const { width } = Dimensions.get('window');
    
    // Use the first selected type as the default active tab if available
    const [activeTypeTab, setActiveTypeTab] = useState(step2.selectedTypes[0]?.id);
    const uploadModes = step3.uploadModes || {};
    const [openUploadModeDropdown, setOpenUploadModeDropdown] = useState(false);
    const [openGridModeDropdown, setOpenGridModeDropdown] = useState(false);

    // Keep active tab valid if types are removed
    useEffect(() => {
        if (step2.selectedTypes.length > 0 && !step2.selectedTypes.find(t => t.id === activeTypeTab)) {
            setActiveTypeTab(step2.selectedTypes[0].id);
        }
    }, [step2.selectedTypes, activeTypeTab]);

    const activeType = step2.selectedTypes.find(t => t.id === activeTypeTab) || step2.selectedTypes[0];

    // Initialize builder data if not present
    useEffect(() => {
        if (activeType && !step3.builderData?.[activeType.id]) {
            dispatch(updateBuilderData({
                typeId: activeType.id,
                subType: activeType.subType,
                builderState: getDefaultBuilderState(activeType.subType)
            }));
        }
    }, [activeType, step3.builderData]);

    const builderState = step3.builderData?.[activeType?.id] || (activeType ? getDefaultBuilderState(activeType.subType) : null);

    const handleUpdateBuilder = (updater) => {
        if (!activeType) return;
        const currentState = step3.builderData?.[activeType.id] || getDefaultBuilderState(activeType.subType);
        const newState = updater(currentState);
        dispatch(updateBuilderData({
            typeId: activeType.id,
            subType: activeType.subType,
            builderState: newState
        }));
    };

    const handleSetActiveSection = (secId) => {
        handleUpdateBuilder(prev => ({ ...prev, activeSectionId: secId, selectedUnitKey: null }));
    };

    const handleAddSection = () => {
        handleUpdateBuilder(prev => {
            const newId = (prev.sections[prev.sections.length - 1]?.id || 0) + 1;
            let newSecName = '';
            if (RANGE_BASED_SUB_TYPES.has(activeType.subType)) {
                newSecName = String.fromCharCode(64 + newId);
            } else if (activeType.subType === 'apartment') {
                newSecName = `Tower ${String.fromCharCode(64 + newId)}`;
            } else {
                newSecName = `Section ${newId}`;
            }
            const newSection = {
                id: newId,
                name: newSecName,
                floors: prev.sections[0]?.floors ?? 5,
                rows: prev.sections[0]?.rows ?? 5,
                lanes: prev.sections[0]?.lanes ?? 5,
                unitsPerFloor: prev.sections[0]?.unitsPerFloor ?? 4,
                plotsPerRow: prev.sections[0]?.plotsPerRow ?? 4,
                villasPerLane: prev.sections[0]?.villasPerLane ?? 4,
                configs: prev.sections[0]?.configs ? JSON.parse(JSON.stringify(prev.sections[0].configs)) : [],
                unitMap: {},
                rowUnitCounts: prev.sections[0]?.rowUnitCounts ? JSON.parse(JSON.stringify(prev.sections[0].rowUnitCounts)) : {},
                unitOverrides: {}
            };
            
            if (newSection.configs.length > 0) {
                const rCount = newSection.floors;
                const cCount = newSection.unitsPerFloor;
                for (let r = 1; r <= rCount; r++) {
                    for (let c = 1; c <= cCount; c++) {
                        newSection.unitMap[`${r}_${c}`] = newSection.configs[0].id;
                    }
                }
            }

            return {
                ...prev,
                sections: [...prev.sections, newSection],
                activeSectionId: newId,
                selectedUnitKey: null
            };
        });
    };

    const handleUpdateDimensions = (field, value) => {
        const parsed = parseInt(value);
        const val = isNaN(parsed) || parsed < 0 ? 0 : parsed;
        handleUpdateBuilder(prev => ({
            ...prev,
            sections: prev.sections.map(sec => {
                if (sec.id !== prev.activeSectionId) return sec;
                const updated = { ...sec, [field]: val };
                if (field === 'floors') { updated.rows = val; updated.lanes = val; }
                if (field === 'rows') { updated.floors = val; updated.lanes = val; }
                if (field === 'lanes') { updated.floors = val; updated.rows = val; }
                if (field === 'unitsPerFloor') { updated.plotsPerRow = val; updated.villasPerLane = val; }
                if (field === 'plotsPerRow') { updated.unitsPerFloor = val; updated.villasPerLane = val; }
                if (field === 'villasPerLane') { updated.unitsPerFloor = val; updated.plotsPerRow = val; }
                return updated;
            })
        }));
    };

    const handleUpdateSectionName = (name) => {
        handleUpdateBuilder(prev => ({
            ...prev,
            sections: prev.sections.map(sec => sec.id === prev.activeSectionId ? { ...sec, name } : sec)
        }));
    };

    const handleRemoveSection = (secId) => {
        handleUpdateBuilder(prev => {
            if (prev.sections.length <= 1) return prev;
            const remaining = prev.sections.filter(s => s.id !== secId);
            return {
                ...prev,
                sections: remaining,
                activeSectionId: prev.activeSectionId === secId ? remaining[0].id : prev.activeSectionId,
                selectedUnitKey: null
            };
        });
    };

    const handleSetActiveConfig = (cfgId) => {
        handleUpdateBuilder(prev => ({ ...prev, activeConfigId: cfgId }));
    };

    const handleAddConfig = () => {
        handleUpdateBuilder(prev => {
            const activeSec = prev.sections.find(s => s.id === prev.activeSectionId);
            if (!activeSec) return prev;
            const shouldApplyAllRanges = RANGE_BASED_SUB_TYPES.has(activeType?.subType);
            const newCfgId = 'cfg_' + Date.now();
            const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];
            const nextColor = colors[activeSec.configs.length % colors.length];
            const newCfg = {
                id: newCfgId,
                type: '',
                name: '',
                area: '',
                price: '',
                color: nextColor,
                images: [],
                brochure: null,
                amenities: ['']
            };
            return {
                ...prev,
                sections: prev.sections.map(sec => {
                    if (!shouldApplyAllRanges && sec.id !== prev.activeSectionId) return sec;
                    return { ...sec, configs: [...sec.configs, JSON.parse(JSON.stringify(newCfg))] };
                }),
                activeConfigId: newCfgId
            };
        });
    };

    const handleRemoveConfig = (cfgId) => {
        handleUpdateBuilder(prev => {
            const activeSec = prev.sections.find(s => s.id === prev.activeSectionId);
            if (!activeSec) return prev;
            const shouldApplyAllRanges = RANGE_BASED_SUB_TYPES.has(activeType?.subType);
            const targetSectionIds = shouldApplyAllRanges ? prev.sections.map(sec => sec.id) : [prev.activeSectionId];

            const remainingConfigs = activeSec.configs.filter(c => c.id !== cfgId);

            return {
                ...prev,
                sections: prev.sections.map(sec => {
                    if (!targetSectionIds.includes(sec.id)) return sec;
                    const secRemainingConfigs = sec.configs.filter(c => c.id !== cfgId);
                    const newUnitMap = { ...sec.unitMap };
                    Object.keys(newUnitMap).forEach(key => {
                        if (newUnitMap[key] === cfgId) {
                            delete newUnitMap[key];
                        }
                    });
                    return {
                        ...sec,
                        configs: secRemainingConfigs,
                        unitMap: newUnitMap
                    };
                }),
                activeConfigId: prev.activeConfigId === cfgId ? (remainingConfigs[0]?.id || null) : prev.activeConfigId
            };
        });
    };

    const handleUpdateConfigField = (cfgId, field, value) => {
        handleUpdateBuilder(prev => ({
            ...prev,
            sections: prev.sections.map(sec => {
                if (!RANGE_BASED_SUB_TYPES.has(activeType?.subType) && sec.id !== prev.activeSectionId) return sec;
                return {
                    ...sec,
                    configs: sec.configs.map(c => c.id === cfgId ? { ...c, [field]: value } : c)
                };
            })
        }));
    };

    const handleAddAmenity = (cfgId) => {
        const config = activeSection?.configs?.find(c => c.id === cfgId);
        if (!config) return;
        handleUpdateConfigField(cfgId, 'amenities', [...(config.amenities || ['']), '']);
    };

    const handleUpdateAmenity = (cfgId, index, value) => {
        const config = activeSection?.configs?.find(c => c.id === cfgId);
        if (!config) return;
        const amenities = [...(config.amenities || [''])];
        amenities[index] = value;
        handleUpdateConfigField(cfgId, 'amenities', amenities);
    };

    const handleRemoveAmenity = (cfgId, index) => {
        const config = activeSection?.configs?.find(c => c.id === cfgId);
        if (!config) return;
        const amenities = [...(config.amenities || [''])];
        amenities.splice(index, 1);
        handleUpdateConfigField(cfgId, 'amenities', amenities.length > 0 ? amenities : ['']);
    };

    const handlePickVariantImages = async (cfgId) => {
        const config = activeSection?.configs?.find(c => c.id === cfgId);
        if (!config) return;

        const currentImages = config.images || [];
        if (currentImages.length >= 5) {
            alert('You can add up to 5 images for each variant.');
            return;
        }

        if (!projectId) {
            alert('Please complete Step 1 before adding images.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: 5 - currentImages.length,
            quality: 0.8,
        });

        if (result.canceled) return;

        try {
            const uploaded = await Promise.all(
                result.assets.map(async (asset) => {
                    const key = await uploadAssetToServer(projectId, asset, 'image');
                    return key ? { uri: asset.uri, key } : null;
                })
            );
            const nextImages = [...currentImages, ...uploaded.filter(Boolean)].slice(0, 5);
            handleUpdateConfigField(cfgId, 'images', nextImages);
        } catch (error) {
            console.error('Variant image upload error:', error);
            alert('Failed to upload one or more images. Please try again.');
        }
    };

    const handleRemoveVariantImage = (cfgId, imageUri) => {
        const config = activeSection?.configs?.find(c => c.id === cfgId);
        if (!config) return;
        const nextImages = (config.images || []).filter(img => img !== imageUri);
        handleUpdateConfigField(cfgId, 'images', nextImages);
    };

    const handlePickVariantBrochure = async (cfgId) => {
        const config = activeSection?.configs?.find(c => c.id === cfgId);
        if (!config) return;

        if (!projectId) {
            alert('Please complete Step 1 before adding a brochure.');
            return;
        }

        const result = await DocumentPicker.getDocumentAsync({
            type: [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ],
            multiple: false,
            copyToCacheDirectory: true
        });

        if (result.canceled || !result.assets?.[0]) return;

        const brochure = result.assets[0];
        try {
            const key = await uploadAssetToServer(projectId, brochure, 'document');
            if (!key) throw new Error('Upload did not return a file key.');
            handleUpdateConfigField(cfgId, 'brochure', {
                name: brochure.name || 'Brochure',
                uri: brochure.uri,
                mimeType: brochure.mimeType || '',
                size: brochure.size || 0,
                key,
            });
        } catch (error) {
            console.error('Variant brochure upload error:', error);
            alert('Failed to upload the brochure. Please try again.');
        }
    };

    const handleRemoveVariantBrochure = (cfgId) => {
        handleUpdateConfigField(cfgId, 'brochure', null);
    };

    const handleCellClick = (key, sectionId) => {
        handleUpdateBuilder(prev => {
            const targetSectionId = sectionId || prev.activeSectionId;
            const targetSec = prev.sections.find(s => s.id === targetSectionId);
            if (!targetSec) return prev;
            const selectedKey = `${targetSectionId}:${key}`;

            if (prev.gridMode === 'paint') {
                if (!prev.activeConfigId) {
                    alert("Please add and select a variant first before assigning units.");
                    return prev;
                }
                const newMap = { ...targetSec.unitMap };
                if (newMap[key] === prev.activeConfigId) {
                    delete newMap[key];
                } else {
                    newMap[key] = prev.activeConfigId;
                }
                return {
                    ...prev,
                    activeSectionId: targetSectionId,
                    sections: prev.sections.map(sec => sec.id === targetSectionId ? { ...sec, unitMap: newMap } : sec)
                };
            } else {
                if (!targetSec.unitMap?.[key]) {
                    alert("Please assign a base variant to this unit in 'Assign Variants' mode before customizing.");
                    return prev;
                }
                return {
                    ...prev,
                    activeSectionId: targetSectionId,
                    selectedUnitKey: selectedKey
                };
            }
        });
    };

    const handleSelectAll = () => {
        handleUpdateBuilder(prev => {
            if (!prev.activeConfigId) {
                alert("Please add and select a variant first before assigning units.");
                return prev;
            }

            const shouldApplyAllRanges = RANGE_BASED_SUB_TYPES.has(activeType?.subType);
            const targetSectionIds = shouldApplyAllRanges
                ? prev.sections.map(sec => sec.id)
                : [prev.activeSectionId];

            return {
                ...prev,
                sections: prev.sections.map(sec => {
                    if (!targetSectionIds.includes(sec.id)) return sec;
                    const rows = sec.floors ?? sec.rows ?? sec.lanes ?? 1;
                    const cols = sec.unitsPerFloor ?? sec.plotsPerRow ?? sec.villasPerLane ?? 1;
                    const newMap = {};
                    for (let r = 1; r <= rows; r++) {
                        const rowCols = sec.rowUnitCounts?.[r] ?? cols;
                        for (let c = 1; c <= rowCols; c++) {
                            newMap[`${r}_${c}`] = prev.activeConfigId;
                        }
                    }
                    return { ...sec, unitMap: newMap };
                })
            };
        });
    };

    const handleClearAll = () => {
        handleUpdateBuilder(prev => {
            const shouldApplyAllRanges = RANGE_BASED_SUB_TYPES.has(activeType?.subType);
            const targetSectionIds = shouldApplyAllRanges
                ? prev.sections.map(sec => sec.id)
                : [prev.activeSectionId];

            return {
                ...prev,
                selectedUnitKey: shouldApplyAllRanges ? null : prev.selectedUnitKey,
                sections: prev.sections.map(sec => {
                    if (!targetSectionIds.includes(sec.id)) return sec;
                    return { ...sec, unitMap: {} };
                })
            };
        });
    };

    const handleAdjustRowUnits = (rowNumber, delta, sectionId) => {
        handleUpdateBuilder(prev => {
            const targetSectionId = sectionId || prev.activeSectionId;
            const activeSec = prev.sections.find(s => s.id === targetSectionId);
            if (!activeSec) return prev;

            const defaultCount = activeSec.unitsPerFloor ?? activeSec.plotsPerRow ?? activeSec.villasPerLane ?? 1;
            const currentCount = activeSec.rowUnitCounts?.[rowNumber] ?? defaultCount;
            const nextCount = Math.max(1, currentCount + delta);
            if (nextCount === currentCount) return prev;

            const nextRowUnitCounts = { ...(activeSec.rowUnitCounts || {}) };
            if (nextCount === defaultCount) {
                delete nextRowUnitCounts[rowNumber];
            } else {
                nextRowUnitCounts[rowNumber] = nextCount;
            }

            const nextUnitMap = { ...(activeSec.unitMap || {}) };
            const nextOverrides = { ...(activeSec.unitOverrides || {}) };
            Object.keys(nextUnitMap).forEach(key => {
                const [rowValue, colValue] = key.split('_').map(Number);
                if (rowValue === rowNumber && colValue > nextCount) {
                    delete nextUnitMap[key];
                }
            });
            Object.keys(nextOverrides).forEach(key => {
                const [rowValue, colValue] = key.split('_').map(Number);
                if (rowValue === rowNumber && colValue > nextCount) {
                    delete nextOverrides[key];
                }
            });

            const selectedUnitKey = prev.selectedUnitKey && (() => {
                const [selectedSectionId, selectedCellKey] = prev.selectedUnitKey.includes(':')
                    ? prev.selectedUnitKey.split(':')
                    : [String(prev.activeSectionId), prev.selectedUnitKey];

                if (parseInt(selectedSectionId, 10) !== targetSectionId) {
                    return prev.selectedUnitKey;
                }

                const [rowValue, colValue] = selectedCellKey.split('_').map(Number);
                return rowValue === rowNumber && colValue > nextCount ? null : prev.selectedUnitKey;
            })();

            return {
                ...prev,
                selectedUnitKey,
                sections: prev.sections.map(sec => sec.id === targetSectionId ? {
                    ...sec,
                    rowUnitCounts: nextRowUnitCounts,
                    unitMap: nextUnitMap,
                    unitOverrides: nextOverrides,
                } : sec)
            };
        });
    };

    const handleUpdateOverride = (compositeKey, field, value) => {
        handleUpdateBuilder(prev => {
            const [sectionIdRaw, key] = compositeKey.includes(':')
                ? compositeKey.split(':')
                : [String(prev.activeSectionId), compositeKey];
            const sectionId = parseInt(sectionIdRaw, 10);
            const activeSec = prev.sections.find(s => s.id === sectionId);
            if (!activeSec) return prev;
            const currentOverrides = { ...activeSec.unitOverrides };
            const unitOverride = { ...(currentOverrides[key] || {}) };
            unitOverride[field] = value;
            currentOverrides[key] = unitOverride;
            return {
                ...prev,
                sections: prev.sections.map(sec => sec.id === sectionId ? { ...sec, unitOverrides: currentOverrides } : sec)
            };
        });
    };

    const handleDownloadFormat = async (type) => {
        try {
            let headers = ['Sub Type', 'Property Number', 'Area', 'Area Unit'];

            if (type.subType === 'apartment') {
                headers.push('BHK', 'Tower', 'Floor');
            } else if (type.subType === 'villa' || type.subType === 'rowhouse') {
                headers.push('BHK');
            } else if (type.subType === 'office') {
                headers.push('Office Type');
            }

            headers.push('Selling Price', 'Price Negotiable', 'Tax Exclude', 'Payment Mode');

            const sampleRow = headers.map(h => {
                if (h === 'Sub Type') return type.subType;
                if (h === 'Property Number') return 'A-101';
                if (h === 'Area') return '1200';
                if (h === 'Area Unit') return 'Sq-ft';
                if (h === 'BHK') return '2 BHK';
                if (h === 'Tower') return 'Tower A';
                if (h === 'Floor') return '1';
                if (h === 'Office Type') return 'Co-working';
                if (h === 'Selling Price') return '5000000';
                if (h === 'Price Negotiable' || h === 'Tax Exclude') return 'false';
                if (h === 'Payment Mode') return 'full';
                return '';
            });

            const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
            const fileName = `${type.subType}_format.csv`;
            const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

            await FileSystem.writeAsStringAsync(fileUri, csvContent, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            await Sharing.shareAsync(fileUri, {
                mimeType: 'text/csv',
                dialogTitle: `Download ${type.subType} CSV Format`,
                UTI: 'public.comma-separated-values-text', // iOS
            });
        } catch (error) {
            console.error('Download format error:', error);
            alert('Could not download format. Please try again.');
        }
    };

    const handleBulkUpload = async (type) => {
        if (!projectId) {
            alert("Project not saved yet. Please complete Step 1 first.");
            return;
        }
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ["text/csv", "text/comma-separated-values", "application/csv", "application/vnd.ms-excel"],
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const asset = result.assets[0];

            // Validate CSV extension
            const fileName = asset.name || asset.uri || '';
            if (!fileName.toLowerCase().endsWith('.csv')) {
                alert("Invalid file type. Please upload a CSV file only.");
                return;
            }

            const formData = new FormData();
            formData.append('csv_file', {
                uri: asset.uri,
                name: asset.name || `${type.subType}_upload.csv`,
                type: 'text/csv',
            });
            formData.append('property_subtype', type.subType);
            formData.append('listing_type', 'buy');

            const res = await projectFormApi.uploadCsvUnits(projectId, formData);
            const totalUnits = res.data.data?.total_units_inserted || 0;

            // Also parse locally to update Redux state for UI preview
            const content = await FileSystem.readAsStringAsync(asset.uri);
            const data = parseCSV(content);
            // Carry forward brochure from existing config so it isn't lost on bulk switch
            const existingConfigs = step3.unitConfigs[type.id] || [];
            const existingBrochure = existingConfigs[0]?.brochure || null;
            const unitConfigs = data
                .filter(row => row['Property Number'])
                .map(row => ({
                    tower: row['Tower'] || '',
                    floor: row['Floor'] || '',
                    bhk: row['BHK'] || '',
                    officeType: row['Office Type'] || '',
                    area: row['Area'] || '',
                    areaUnit: row['Area Unit'] || 'Sq-ft',
                    price: row['Selling Price'] || '',
                    amenities: [''],
                    propertyNumber: row['Property Number'] || '',
                    hasShop: false,
                    brochure: existingBrochure,
                    extraCharges: [{ title: '', amount: '' }],
                }));

            dispatch(bulkUploadSubtype({ typeId: type.id, unitConfigs }));
            alert(`✓ ${totalUnits} units uploaded successfully for ${type.subType}.`);
        } catch (error) {
            console.error("CSV Upload error:", error);
            const msg = error.response?.data?.message || "Failed to upload CSV. Please check the file format and try again.";
            alert(msg);
        }
    };

    if (step2.selectedTypes.length === 0) {
        return (
            <View className="items-center py-10">
                <Text className="text-gray-400 font-lato">No property types selected in Step 2.</Text>
            </View>
        );
    }

    const activeSection = builderState?.sections?.find(s => s.id === builderState.activeSectionId) || builderState?.sections?.[0];
    const activeConfig = activeSection?.configs?.find(c => c.id === builderState?.activeConfigId) || activeSection?.configs?.[0];
    const configsList = step3.unitConfigs[activeType?.id] || [];
    const getRowUnitCount = (section, rowNumber) => section?.rowUnitCounts?.[rowNumber] ?? (section?.unitsPerFloor ?? section?.plotsPerRow ?? section?.villasPerLane ?? 1);
    const sectionsForGrid = RANGE_BASED_SUB_TYPES.has(activeType?.subType)
        ? (builderState?.sections || [])
        : (activeSection ? [activeSection] : []);

    return (
        <View className="gap-6">
            <Text className="text-base font-lato-bold text-black">Configure Units (Project Engine)</Text>

            {/* Subtypes Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
                {step2.selectedTypes.map((type) => {
                    const typeIcon = subTypesData[type.mainType]?.find(t => t.id === type.subType)?.image;
                    const isActive = activeTypeTab === type.id;
                    return (
                        <TouchableOpacity
                            key={String(type.id ?? type.subType ?? Math.random())}
                            onPress={() => setActiveTypeTab(type.id)}
                            className={`bg-white border rounded-lg px-3 py-2 mb-1 flex-row items-center mr-3 ${isActive ? 'border-[#4A43EC]' : 'border-gray-100'}`}
                        >
                            <View className="w-8 h-8 bg-[#F4F7FF] rounded-md items-center justify-center mr-2">
                                <Image source={typeIcon} className="w-5 h-5" resizeMode="contain" />
                            </View>
                            <View className="justify-center">
                                <Text className={`font-lato-bold text-[11px] leading-tight ${isActive ? 'text-[#4A43EC]' : 'text-black'}`}>
                                    {type.subType.toUpperCase()}
                                </Text>
                                <Text className={`text-[9px] font-lato-bold uppercase mt-0.5 leading-tight ${isActive ? 'text-[#4A43EC]/80' : 'text-gray-500'}`}>
                                    {type.mainType}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <View className="h-[1px] bg-gray-100 my-1" />

            {/* Upload Mode Switcher */}
            {activeType && (
                <View className="gap-4">
                    <View className="z-[60]">
                        <Text className="text-xs font-lato-bold text-gray-500 mb-2.5">Configuration Mode for {activeType.subType}</Text>
                        <TouchableOpacity
                            onPress={() => setOpenUploadModeDropdown(!openUploadModeDropdown)}
                            className="bg-white border border-gray-200 rounded-xl px-4 h-12 flex-row items-center justify-between"
                        >
                            <Text className="text-sm font-lato-medium text-black">
                                {uploadModes[activeType.id] === 'bulk' ? 'Bulk upload (CSV)' : 'Visual Builder (Project Engine)'}
                            </Text>
                            <Ionicons name={openUploadModeDropdown ? "chevron-up" : "chevron-down"} size={18} color="#666" />
                        </TouchableOpacity>

                        {openUploadModeDropdown && (
                            <View className="absolute top-[72px] left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg z-[61] overflow-hidden">
                                <TouchableOpacity
                                    onPress={() => {
                                        dispatch(setUploadMode({ typeId: activeType.id, mode: 'manual' }));
                                        setOpenUploadModeDropdown(false);
                                    }}
                                    className={`px-4 py-3 border-b border-gray-50 ${uploadModes[activeType.id] !== 'bulk' ? 'bg-[#F4F7FF]' : ''}`}
                                >
                                    <Text className={`text-sm font-lato-bold ${uploadModes[activeType.id] !== 'bulk' ? 'text-[#4A43EC]' : 'text-gray-800'}`}>Visual Builder (Project Engine)</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        dispatch(setUploadMode({ typeId: activeType.id, mode: 'bulk' }));
                                        setOpenUploadModeDropdown(false);
                                    }}
                                    className={`px-4 py-3 ${uploadModes[activeType.id] === 'bulk' ? 'bg-[#F4F7FF]' : ''}`}
                                >
                                    <Text className={`text-sm font-lato-bold ${uploadModes[activeType.id] === 'bulk' ? 'text-[#4A43EC]' : 'text-gray-800'}`}>Bulk upload (CSV)</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {uploadModes[activeType.id] === 'bulk' ? (
                        <View className="bg-[#4A43EC]/5 p-6 rounded-2xl border border-[#4A43EC]/10 items-center justify-center gap-5">
                            <MaterialIcons name="cloud-upload" size={48} color="#4A43EC" opacity={0.5} />
                            <Text className="text-center text-sm font-lato-medium text-gray-600 mb-2">
                                Download the format, fill in your {activeType.subType} details, and upload the CSV file.
                            </Text>
                            <View className="flex-row gap-3 w-full">
                                <TouchableOpacity 
                                    onPress={() => handleBulkUpload(activeType)}
                                    className="flex-1 bg-[#4A43EC] h-12 rounded-xl flex-row items-center justify-center gap-2"
                                >
                                    <MaterialIcons name="file-upload" size={18} color="white" />
                                    <Text className="text-white font-lato-bold text-[11px]">Upload CSV</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={() => handleDownloadFormat(activeType)}
                                    className="flex-1 bg-white border border-gray-200 h-12 rounded-xl flex-row items-center justify-center gap-2"
                                >
                                    <MaterialIcons name="file-download" size={18} color="#6B7280" />
                                    <Text className="text-gray-500 font-lato-bold text-[11px]">Down format</Text>
                                </TouchableOpacity>
                            </View>
                            {configsList.length > 0 && (
                                <View className="w-full mt-1 gap-2">
                                    <View className="flex-row items-center gap-2">
                                        <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                                        <Text className="text-xs text-green-600 font-lato-bold">
                                            {configsList.length} units saved
                                        </Text>
                                    </View>
                                    {/* Header row */}
                                    <View className="flex-row bg-[#4A43EC]/10 rounded-lg px-3 py-2">
                                        <Text className="flex-1 text-[9px] font-lato-bold text-[#4A43EC] uppercase">Unit #</Text>
                                        <Text className="w-16 text-[9px] font-lato-bold text-[#4A43EC] uppercase">Tower/Block</Text>
                                        <Text className="w-12 text-[9px] font-lato-bold text-[#4A43EC] uppercase">Floor</Text>
                                        <Text className="w-14 text-[9px] font-lato-bold text-[#4A43EC] uppercase">BHK/Type</Text>
                                        <Text className="w-16 text-[9px] font-lato-bold text-[#4A43EC] uppercase text-right">Price</Text>
                                    </View>
                                    {/* Unit rows — cap at 50 for perf */}
                                    {configsList.slice(0, 50).map((u, idx) => (
                                        <View key={idx} className={`flex-row px-3 py-2 rounded-lg ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border border-gray-100`}>
                                            <Text className="flex-1 text-[10px] font-lato text-gray-700" numberOfLines={1}>{u.propertyNumber || '-'}</Text>
                                            <Text className="w-16 text-[10px] font-lato text-gray-500" numberOfLines={1}>{u.tower || '-'}</Text>
                                            <Text className="w-12 text-[10px] font-lato text-gray-500" numberOfLines={1}>{u.floor || '-'}</Text>
                                            <Text className="w-14 text-[10px] font-lato text-gray-500" numberOfLines={1}>{u.bhk || u.officeType || '-'}</Text>
                                            <Text className="w-16 text-[10px] font-lato-bold text-[#4A43EC] text-right" numberOfLines={1}>
                                                {u.price ? `₹${Number(u.price).toLocaleString('en-IN')}` : '-'}
                                            </Text>
                                        </View>
                                    ))}
                                    {configsList.length > 50 && (
                                        <Text className="text-[10px] text-gray-400 font-lato text-center py-1">
                                            +{configsList.length - 50} more units
                                        </Text>
                                    )}
                                </View>
                            )}
                        </View>
                    ) : (
                        <View className="gap-6">
                            {/* Section Management Header */}
                            {builderState && activeSection && (
                                <View className="gap-4">
                                    <View className="flex-row items-center justify-between">
                                        <Text className="text-sm font-lato-bold text-black">
                                            {RANGE_BASED_SUB_TYPES.has(activeType.subType)
                                                ? 'Range Types & Property Count'
                                                : (activeType.subType === 'apartment' ? 'Towers / Buildings' : 'Sections / Divisions')}
                                        </Text>
                                        <TouchableOpacity 
                                            onPress={handleAddSection}
                                            className="flex-row items-center bg-[#F4F7FF] border border-[#4A43EC]/30 px-3 py-1.5 rounded-full gap-1"
                                        >
                                            <Ionicons name="add-circle-outline" size={16} color="#4A43EC" />
                                            <Text className="text-[#4A43EC] text-xs font-lato-bold">
                                                Add {RANGE_BASED_SUB_TYPES.has(activeType.subType) ? 'Range' : (activeType.subType === 'apartment' ? 'Tower' : 'Section')}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                                        {builderState.sections.map(sec => (
                                            <TouchableOpacity
                                                key={sec.id}
                                                onPress={() => handleSetActiveSection(sec.id)}
                                                className={`px-4 py-2 rounded-xl border flex-row items-center gap-2 mr-2 ${sec.id === builderState.activeSectionId ? 'bg-[#4A43EC] border-[#4A43EC]' : 'bg-white border-gray-200'}`}
                                            >
                                                <Text className={`text-xs font-lato-bold ${sec.id === builderState.activeSectionId ? 'text-white' : 'text-gray-700'}`}>
                                                    {sec.name}
                                                </Text>
                                                {builderState.sections.length > 1 && (
                                                    <TouchableOpacity onPress={() => handleRemoveSection(sec.id)} className="p-0.5">
                                                        <Ionicons name="close-circle" size={16} color={sec.id === builderState.activeSectionId ? "white" : "#9CA3AF"} />
                                                    </TouchableOpacity>
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>

                                    {/* Active Section Settings Card */}
                                    <View className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm gap-4">
                                        <View>
                                            <Text className="text-xs font-lato-bold text-gray-500 mb-2">
                                                {RANGE_BASED_SUB_TYPES.has(activeType.subType)
                                                    ? 'Range Type (A, B, C...)'
                                                    : (activeType.subType === 'apartment' ? 'Tower Name' : 'Section Name')}
                                            </Text>
                                            <View className="bg-white border border-gray-200 rounded-xl px-4 h-12 justify-center">
                                                <TextInput
                                                    className="text-sm text-gray-800 font-lato-medium"
                                                    value={activeSection.name}
                                                    onChangeText={handleUpdateSectionName}
                                                    style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                                                />
                                            </View>
                                        </View>

                                        {RANGE_BASED_SUB_TYPES.has(activeType.subType) ? (
                                            <View>
                                                <Text className="text-xs font-lato-bold text-gray-500 mb-2">No. of Properties in this Range</Text>
                                                <View className="bg-white border border-gray-200 rounded-xl px-4 h-12 justify-center">
                                                    <TextInput
                                                        className="text-sm text-gray-800 font-lato-medium"
                                                        keyboardType="numeric"
                                                        value={(activeSection.unitsPerFloor ?? activeSection.plotsPerRow ?? activeSection.villasPerLane ?? 0).toString()}
                                                        onChangeText={v => handleUpdateDimensions(activeType.subType === 'plot' ? 'plotsPerRow' : (activeType.subType === 'villa' || activeType.subType === 'rowhouse' ? 'villasPerLane' : 'unitsPerFloor'), v)}
                                                        style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                                                    />
                                                </View>
                                            </View>
                                        ) : (
                                            <View className="flex-row gap-4">
                                                <View className="flex-1">
                                                    <Text className="text-xs font-lato-bold text-gray-500 mb-2">
                                                        {activeType.subType === 'plot' ? 'Number of Rows' : (activeType.subType === 'villa' || activeType.subType === 'rowhouse' ? 'Number of Lanes' : 'Number of Floors')}
                                                    </Text>
                                                    <View className="bg-white border border-gray-200 rounded-xl px-4 h-12 justify-center">
                                                        <TextInput
                                                            className="text-sm text-gray-800 font-lato-medium"
                                                            keyboardType="numeric"
                                                            value={(activeSection.floors ?? activeSection.rows ?? activeSection.lanes ?? 0).toString()}
                                                            onChangeText={v => handleUpdateDimensions(activeType.subType === 'plot' ? 'rows' : (activeType.subType === 'villa' || activeType.subType === 'rowhouse' ? 'lanes' : 'floors'), v)}
                                                            style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                                                        />
                                                    </View>
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="text-xs font-lato-bold text-gray-500 mb-2">
                                                        {activeType.subType === 'plot' ? 'Plots per Row' : (activeType.subType === 'villa' || activeType.subType === 'rowhouse' ? 'Villas per Lane' : 'Units per Floor')}
                                                    </Text>
                                                    <View className="bg-white border border-gray-200 rounded-xl px-4 h-12 justify-center">
                                                        <TextInput
                                                            className="text-sm text-gray-800 font-lato-medium"
                                                            keyboardType="numeric"
                                                            value={(activeSection.unitsPerFloor ?? activeSection.plotsPerRow ?? activeSection.villasPerLane ?? 0).toString()}
                                                            onChangeText={v => handleUpdateDimensions(activeType.subType === 'plot' ? 'plotsPerRow' : (activeType.subType === 'villa' || activeType.subType === 'rowhouse' ? 'villasPerLane' : 'unitsPerFloor'), v)}
                                                            style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                    </View>

                                    {/* Variant Configs Section */}
                                    <View className="gap-4 mt-2">
                                        <View className="flex-row items-center justify-between">
                                            <Text className="text-sm font-lato-bold text-black">Define Variant Types & Pricing</Text>
                                            <TouchableOpacity 
                                                onPress={handleAddConfig}
                                                className="flex-row items-center bg-[#F4F7FF] border border-[#4A43EC]/30 px-3 py-1.5 rounded-full gap-1"
                                            >
                                                <Ionicons name="add-circle-outline" size={16} color="#4A43EC" />
                                                <Text className="text-[#4A43EC] text-xs font-lato-bold">Add Variant</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
                                            {activeSection.configs?.length === 0 && (
                                                <View className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-4 mr-3 w-48 opacity-60">
                                                    <View className="flex-row items-center gap-1.5 mb-2">
                                                        <View className="w-3 h-3 rounded-full bg-gray-400" />
                                                        <Text className="text-xs font-lato-bold text-gray-500">Example: 2 BHK</Text>
                                                    </View>
                                                    <Text className="text-[11px] text-gray-400 font-lato-medium mb-2">Standard</Text>
                                                    <View className="flex-row items-center justify-between border-t border-gray-200 pt-2 mt-1">
                                                        <Text className="text-[11px] font-lato-bold text-gray-400">1150 {activeType.subType === 'plot' ? 'sqyd' : 'sqft'}</Text>
                                                        <Text className="text-[11px] font-lato-bold text-gray-400">₹65,00,000</Text>
                                                    </View>
                                                </View>
                                            )}

                                            {activeSection.configs?.map(cfg => (
                                                <TouchableOpacity
                                                    key={cfg.id}
                                                    onPress={() => handleSetActiveConfig(cfg.id)}
                                                    className={`bg-white border rounded-xl p-3 mb-1 mr-3 w-40 shadow-xs ${cfg.id === builderState.activeConfigId ? 'border-[#4A43EC] bg-[#F4F7FF]/50' : 'border-gray-200'}`}
                                                >
                                                    <View className="flex-row items-center justify-between mb-1.5">
                                                        <View className="flex-row items-center gap-1.5 flex-1 mr-1">
                                                            <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color || '#3B82F6' }} />
                                                            <Text className="text-xs font-lato-bold text-gray-800" numberOfLines={1}>
                                                                {cfg.type || (activeType.subType === 'office' ? 'New Office' : (activeType.subType === 'plot' ? 'New Plot' : 'New Variant'))}
                                                            </Text>
                                                        </View>
                                                        <View className="flex-row items-center gap-1">
                                                            {cfg.id === builderState.activeConfigId && (
                                                                <View className="bg-[#4A43EC] rounded-full p-0.5">
                                                                    <Ionicons name="checkmark" size={10} color="white" />
                                                                </View>
                                                            )}
                                                            <TouchableOpacity onPress={() => handleRemoveConfig(cfg.id)} className="p-0.5">
                                                                <Ionicons name="close-circle" size={16} color="#EF4444" />
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                    <Text className="text-[10px] text-gray-500 font-lato-medium mb-1.5" numberOfLines={1}>{cfg.name || 'Unnamed'}</Text>
                                                    <View className="flex-row items-center justify-between border-t border-gray-100 pt-1.5 mt-0.5">
                                                        <Text className="text-[10px] font-lato-bold text-gray-700">{cfg.area ? `${cfg.area} ${activeType.subType === 'plot' ? 'sqyd' : 'sqft'}` : '0 sqft'}</Text>
                                                        <Text className="text-[10px] font-lato-bold text-[#4A43EC]">{cfg.price ? `₹${cfg.price}` : '₹0'}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>

                                        {/* Edit Active Config Form */}
                                        {activeConfig && (
                                            <View className="bg-[#F4F7FF]/40 border border-[#4A43EC]/20 rounded-3xl p-5 gap-4">
                                                <Text className="text-xs font-lato-bold text-[#4A43EC]">
                                                    Edit Active Variant: {activeConfig.type || 'New Variant'}
                                                </Text>
                                                <View className="flex-row gap-4">
                                                    <View className="flex-1">
                                                        <Text className="text-[11px] font-lato-bold text-gray-500 mb-1.5">Category / Type</Text>
                                                        <View className="bg-white border border-gray-200 rounded-xl px-3 h-11 justify-center">
                                                            <TextInput
                                                                className="text-xs text-gray-800 font-lato-medium"
                                                                placeholder={activeType.subType === 'office' ? 'eg. Co-working' : (activeType.subType === 'plot' ? 'eg. Standard Plot' : 'eg. 2 BHK')}
                                                                placeholderTextColor="#9CA3AF"
                                                                value={activeConfig.type}
                                                                onChangeText={v => handleUpdateConfigField(activeConfig.id, 'type', v)}
                                                                style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                                                            />
                                                        </View>
                                                    </View>
                                                    <View className="flex-1">
                                                        <Text className="text-[11px] font-lato-bold text-gray-500 mb-1.5">Variant Name</Text>
                                                        <View className="bg-white border border-gray-200 rounded-xl px-3 h-11 justify-center">
                                                            <TextInput
                                                                className="text-xs text-gray-800 font-lato-medium"
                                                                placeholder="eg. Standard / Premium"
                                                                placeholderTextColor="#9CA3AF"
                                                                value={activeConfig.name}
                                                                onChangeText={v => handleUpdateConfigField(activeConfig.id, 'name', v)}
                                                                style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                                                            />
                                                        </View>
                                                    </View>
                                                </View>

                                                <View className="gap-3">
                                                    <View className="flex-row items-center justify-between">
                                                        <Text className="text-[11px] font-lato-bold text-gray-500">Variant Images</Text>
                                                        <TouchableOpacity
                                                            onPress={() => handlePickVariantImages(activeConfig.id)}
                                                            className="px-3 py-1.5 rounded-full bg-white border border-[#4A43EC]/20"
                                                        >
                                                            <Text className="text-[10px] font-lato-bold text-[#4A43EC]">Add Images</Text>
                                                        </TouchableOpacity>
                                                    </View>

                                                    <Text className="text-[10px] text-gray-500 font-lato-medium px-1">
                                                        Add up to 5 images for this variant.
                                                    </Text>

                                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                                                        {(activeConfig.images || []).map((imageValue, index) => {
                                                            const imageSource = normalizeImageSource(imageValue);
                                                            if (!imageSource) return null;
                                                            const itemKey = typeof imageValue === 'string' ? imageValue : imageValue?.uri || `${activeConfig.id}-${index}`;
                                                            return (
                                                                <View key={itemKey} className="mr-2 relative">
                                                                    <View className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
                                                                        <Image source={imageSource} className="w-full h-full" resizeMode="cover" />
                                                                    </View>
                                                                    <TouchableOpacity
                                                                        onPress={() => handleRemoveVariantImage(activeConfig.id, imageValue)}
                                                                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 items-center justify-center"
                                                                    >
                                                                        <Ionicons name="close" size={12} color="white" />
                                                                    </TouchableOpacity>
                                                                </View>
                                                            );
                                                        })}

                                                        {(activeConfig.images || []).length < 5 && (
                                                            <TouchableOpacity
                                                                onPress={() => handlePickVariantImages(activeConfig.id)}
                                                                className="w-20 h-20 rounded-2xl border border-dashed border-[#4A43EC]/40 bg-[#F4F7FF] items-center justify-center mr-2"
                                                            >
                                                                <Ionicons name="add" size={22} color="#4A43EC" />
                                                                <Text className="text-[9px] font-lato-bold text-[#4A43EC] mt-1">Add</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </ScrollView>
                                                </View>

                                                <View className="gap-3">
                                                    <View className="flex-row items-center justify-between">
                                                        <Text className="text-[11px] font-lato-bold text-gray-500">Brochure Document</Text>
                                                        <TouchableOpacity
                                                            onPress={() => handlePickVariantBrochure(activeConfig.id)}
                                                            className="px-3 py-1.5 rounded-full bg-white border border-[#4A43EC]/20"
                                                        >
                                                            <Text className="text-[10px] font-lato-bold text-[#4A43EC]">
                                                                {activeConfig.brochure?.uri ? 'Replace Brochure' : 'Upload Brochure'}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </View>

                                                    {activeConfig.brochure?.uri ? (
                                                        <View className="flex-row items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-3">
                                                            <View className="flex-row items-center flex-1 mr-3">
                                                                <View className="w-8 h-8 rounded-lg bg-[#F4F7FF] items-center justify-center mr-2">
                                                                    <Ionicons name="document-text-outline" size={16} color="#4A43EC" />
                                                                </View>
                                                                <Text className="text-[11px] font-lato-medium text-gray-700 flex-1" numberOfLines={1}>
                                                                    {activeConfig.brochure.name || 'Brochure'}
                                                                </Text>
                                                            </View>
                                                            <TouchableOpacity
                                                                onPress={() => handleRemoveVariantBrochure(activeConfig.id)}
                                                                className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 items-center justify-center"
                                                            >
                                                                <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                                            </TouchableOpacity>
                                                        </View>
                                                    ) : (
                                                        <TouchableOpacity
                                                            onPress={() => handlePickVariantBrochure(activeConfig.id)}
                                                            className="bg-white border border-dashed border-[#4A43EC]/35 rounded-xl px-3 py-3 flex-row items-center"
                                                        >
                                                            <View className="w-8 h-8 rounded-lg bg-[#F4F7FF] items-center justify-center mr-2">
                                                                <Ionicons name="attach-outline" size={16} color="#4A43EC" />
                                                            </View>
                                                            <Text className="text-[11px] font-lato-medium text-gray-600">
                                                                Add brochure (PDF/DOC)
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </View>

                                                <View className="gap-3">
                                                    <View className="flex-row items-center justify-between">
                                                        <Text className="text-[11px] font-lato-bold text-gray-500">Amenities</Text>
                                                        <TouchableOpacity
                                                            onPress={() => handleAddAmenity(activeConfig.id)}
                                                            className="px-3 py-1.5 rounded-full bg-white border border-[#4A43EC]/20"
                                                        >
                                                            <Text className="text-[10px] font-lato-bold text-[#4A43EC]">Add Amenity</Text>
                                                        </TouchableOpacity>
                                                    </View>

                                                    {(activeConfig.amenities || ['']).map((amenity, index) => (
                                                        <View key={`${activeConfig.id}-amenity-${index}`} className="flex-row items-center gap-2">
                                                            <View className="flex-1 bg-white border border-gray-200 rounded-xl px-3 h-11 justify-center">
                                                                <TextInput
                                                                    className="text-xs text-gray-800 font-lato-medium"
                                                                    placeholder="Add amenity"
                                                                    value={amenity}
                                                                    onChangeText={(v) => handleUpdateAmenity(activeConfig.id, index, v)}
                                                                    style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                                                                />
                                                            </View>
                                                            {(activeConfig.amenities || ['']).length > 1 && (
                                                                <TouchableOpacity
                                                                    onPress={() => handleRemoveAmenity(activeConfig.id, index)}
                                                                    className="w-10 h-11 rounded-xl bg-red-50 border border-red-100 items-center justify-center"
                                                                >
                                                                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                                                </TouchableOpacity>
                                                            )}
                                                        </View>
                                                    ))}
                                                </View>

                                                <View className="flex-row gap-4">
                                                    <View className="flex-1">
                                                        <Text className="text-[11px] font-lato-bold text-gray-500 mb-1.5">Area ({activeType.subType === 'plot' ? 'sqyd' : 'sqft'})</Text>
                                                        <View className="bg-white border border-gray-200 rounded-xl px-3 h-11 justify-center">
                                                            <TextInput
                                                                className="text-xs text-gray-800 font-lato-medium"
                                                                placeholder={activeType.subType === 'plot' ? 'eg. 150' : 'eg. 1150'}
                                                                placeholderTextColor="#9CA3AF"
                                                                keyboardType="numeric"
                                                                value={activeConfig.area}
                                                                onChangeText={v => handleUpdateConfigField(activeConfig.id, 'area', v)}
                                                                style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                                                            />
                                                        </View>
                                                    </View>
                                                    <View className="flex-1">
                                                        <Text className="text-[11px] font-lato-bold text-gray-500 mb-1.5">Selling Price (₹)</Text>
                                                        <View className="bg-white border border-gray-200 rounded-xl px-3 h-11 justify-center">
                                                            <TextInput
                                                                className="text-xs text-gray-800 font-lato-medium"
                                                                placeholder="eg. 6500000"
                                                                placeholderTextColor="#9CA3AF"
                                                                keyboardType="numeric"
                                                                value={activeConfig.price}
                                                                onChangeText={v => handleUpdateConfigField(activeConfig.id, 'price', v)}
                                                                style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                                                            />
                                                        </View>
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                    </View>

                                    {/* Grid Mode Switcher & Visual Grid */}
                                    <View className="gap-4 mt-2">
                                        <View className="flex-row items-center justify-between z-40">
                                            <View className="flex-1 mr-4">
                                                <Text className="text-xs font-lato-bold text-gray-700 mb-1">Matrix Interaction Mode</Text>
                                                <Text className="text-[11px] font-lato text-gray-400">Choose whether to paint variants or edit individual unit overrides</Text>
                                            </View>
                                            
                                            <View className="relative w-48">
                                                <TouchableOpacity
                                                    onPress={() => setOpenGridModeDropdown(!openGridModeDropdown)}
                                                    className="flex-row items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm"
                                                >
                                                    <View className="flex-row items-center gap-2">
                                                        <Ionicons name={builderState.gridMode === 'paint' ? "color-palette-outline" : "create-outline"} size={16} color="#4A43EC" />
                                                        <Text className="text-xs font-lato-bold text-[#4A43EC]">
                                                            {builderState.gridMode === 'paint' ? 'Paint Grid' : 'Edit Overrides'}
                                                        </Text>
                                                    </View>
                                                    <Ionicons name={openGridModeDropdown ? "chevron-up" : "chevron-down"} size={16} color="#4A43EC" />
                                                </TouchableOpacity>

                                                {openGridModeDropdown && (
                                                    <View className="absolute top-12 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg shadow-gray-200 py-1.5 z-50">
                                                        <TouchableOpacity
                                                            onPress={() => {
                                                                handleUpdateBuilder(prev => ({ ...prev, gridMode: 'paint', selectedUnitKey: null }));
                                                                setOpenGridModeDropdown(false);
                                                            }}
                                                            className="px-4 py-2.5 hover:bg-gray-50 flex-row items-center justify-between"
                                                        >
                                                            <View className="flex-row items-center gap-2">
                                                                <Ionicons name="color-palette-outline" size={16} color="#4A43EC" />
                                                                <Text className="text-xs font-lato-medium text-gray-800">Paint Grid</Text>
                                                            </View>
                                                            {builderState.gridMode === 'paint' && <Ionicons name="checkmark-circle" size={16} color="#4A43EC" />}
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            onPress={() => {
                                                                handleUpdateBuilder(prev => ({ ...prev, gridMode: 'edit' }));
                                                                setOpenGridModeDropdown(false);
                                                            }}
                                                            className="px-4 py-2.5 hover:bg-gray-50 flex-row items-center justify-between border-t border-gray-50"
                                                        >
                                                            <View className="flex-row items-center gap-2">
                                                                <Ionicons name="create-outline" size={16} color="#4A43EC" />
                                                                <Text className="text-xs font-lato-medium text-gray-800">Edit Overrides</Text>
                                                            </View>
                                                            {builderState.gridMode === 'edit' && <Ionicons name="checkmark-circle" size={16} color="#4A43EC" />}
                                                        </TouchableOpacity>
                                                    </View>
                                                )}
                                            </View>
                                        </View>

                                        {builderState.gridMode === 'paint' ? (
                                            <View className="gap-3">
                                                <View className="flex-row items-center justify-between px-1">
                                                    <Text className="text-xs font-lato-bold text-gray-500">
                                                        Click units below to assign: <Text className="text-[#4A43EC]">{activeConfig?.type}</Text>
                                                    </Text>
                                                    <View className="flex-row gap-2">
                                                        <TouchableOpacity onPress={handleSelectAll} className="px-3 py-1 bg-[#F4F7FF] border border-[#4A43EC]/20 rounded-lg">
                                                            <Text className="text-[10px] font-lato-bold text-[#4A43EC]">Select All</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity onPress={handleClearAll} className="px-3 py-1 bg-red-50 border border-red-100 rounded-lg">
                                                            <Text className="text-[10px] font-lato-bold text-red-500">Clear All</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>

                                                <View className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm gap-4 overflow-hidden">
                                                    {sectionsForGrid.map((section) => {
                                                        const rows = section.floors ?? section.rows ?? section.lanes ?? 1;
                                                        const rowsArr = Array.from({ length: rows }, (_, i) => activeType.subType === 'plot' ? i + 1 : rows - i);

                                                        return (
                                                            <View key={`paint-section-${section.id}`} className="gap-3">
                                                                {rowsArr.map(r => (
                                                                    <View key={`${section.id}-${r}`} className="flex-row items-center gap-3">
                                                                        <View className="w-16 h-16 bg-[#F8FAFC] border border-gray-200 rounded-2xl items-center justify-center shadow-xs">
                                                                            <Text className="text-xs font-lato-bold text-gray-700 uppercase tracking-wider">
                                                                                {RANGE_BASED_SUB_TYPES.has(activeType.subType)
                                                                                    ? `RANGE ${section.name}`
                                                                                    : (activeType.subType === 'plot' ? `ROW ${r}` : (activeType.subType === 'villa' || activeType.subType === 'rowhouse' ? `LANE ${r}` : `FL ${r}`))}
                                                                            </Text>
                                                                            <Text className="text-[9px] font-lato-bold text-gray-400 mt-1">
                                                                                {getRowUnitCount(section, r)} units
                                                                            </Text>
                                                                        </View>

                                                                        <View className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
                                                                            <TouchableOpacity
                                                                                onPress={() => handleAdjustRowUnits(r, 1, section.id)}
                                                                                className="w-10 h-8 items-center justify-center border-b border-gray-100"
                                                                            >
                                                                                <Ionicons name="add" size={16} color="#4A43EC" />
                                                                            </TouchableOpacity>
                                                                            <TouchableOpacity
                                                                                onPress={() => handleAdjustRowUnits(r, -1, section.id)}
                                                                                className="w-10 h-8 items-center justify-center"
                                                                            >
                                                                                <Ionicons name="remove" size={16} color="#EF4444" />
                                                                            </TouchableOpacity>
                                                                        </View>

                                                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1 flex-row gap-3">
                                                                            {Array.from({ length: getRowUnitCount(section, r) }, (_, i) => i + 1).map(c => {
                                                                                const key = `${r}_${c}`;
                                                                                const assignedCfgId = section.unitMap?.[key];
                                                                                const assignedCfg = section.configs?.find(cfg => cfg.id === assignedCfgId);
                                                                                const override = section.unitOverrides?.[key] || {};
                                                                                const displayNum = `${r}${c.toString().padStart(2, '0')}`;
                                                                                const label = override.customName || displayNum;
                                                                                const showBadge = Boolean(assignedCfg && /premium/i.test(`${assignedCfg.type || ''} ${assignedCfg.name || ''}`));

                                                                                return (
                                                                                    <TouchableOpacity
                                                                                        key={`${section.id}-${key}`}
                                                                                        onPress={() => handleCellClick(key, section.id)}
                                                                                        style={{
                                                                                            backgroundColor: assignedCfg ? assignedCfg.color : '#FFFFFF',
                                                                                            borderColor: assignedCfg ? assignedCfg.color : '#CBD5E1',
                                                                                            borderWidth: assignedCfg ? 0 : 1.5,
                                                                                            borderStyle: assignedCfg ? 'solid' : 'dashed'
                                                                                        }}
                                                                                        className="w-28 h-16 rounded-2xl items-center justify-center mr-3 relative overflow-hidden shadow-xs"
                                                                                    >
                                                                                        <Text className={`text-xs font-lato-bold ${assignedCfg ? 'text-white' : 'text-gray-400'}`} numberOfLines={1}>
                                                                                            {label}
                                                                                        </Text>
                                                                                        {assignedCfg ? (
                                                                                            <>
                                                                                                <Text className="text-[10px] font-lato-bold text-white/95 mt-0.5" numberOfLines={1}>
                                                                                                    {assignedCfg.type}
                                                                                                </Text>
                                                                                                <Text className="text-[9px] font-lato-bold text-white/85 uppercase tracking-wider mt-0.5" numberOfLines={1}>
                                                                                                    {assignedCfg.name}
                                                                                                </Text>
                                                                                            </>
                                                                                        ) : (
                                                                                            <Text className="text-[9px] font-lato text-gray-300 mt-1 uppercase" numberOfLines={1}>
                                                                                                Unassigned
                                                                                            </Text>
                                                                                        )}

                                                                                        {showBadge && (
                                                                                            <View className="absolute top-0 right-0 w-4 h-4 bg-[#F59E0B] rounded-bl-lg items-center justify-center shadow-xs">
                                                                                                <Ionicons name="star" size={9} color="white" />
                                                                                            </View>
                                                                                        )}
                                                                                    </TouchableOpacity>
                                                                                );
                                                                            })}
                                                                        </ScrollView>
                                                                    </View>
                                                                ))}
                                                            </View>
                                                        );
                                                    })}

                                                    {/* Bottom Foundation Bar */}
                                                    <View className="bg-[#E2E8F0] h-6 rounded-xl mt-2 border border-gray-300 shadow-xs" />
                                                </View>
                                            </View>
                                        ) : (
                                            <View className="gap-4">
                                                <Text className="text-xs font-lato-bold text-gray-500 px-1">
                                                    Click any unit on the grid below to customize its specific price, area, or property number.
                                                </Text>

                                                <View className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm gap-4 overflow-hidden">
                                                    {sectionsForGrid.map((section) => {
                                                        const rows = section.floors ?? section.rows ?? section.lanes ?? 1;
                                                        const rowsArr = Array.from({ length: rows }, (_, i) => activeType.subType === 'plot' ? i + 1 : rows - i);

                                                        return (
                                                            <View key={`edit-section-${section.id}`} className="gap-3">
                                                                {rowsArr.map(r => (
                                                                    <View key={`${section.id}-${r}`} className="flex-row items-center gap-3">
                                                                        <View className="w-16 h-16 bg-[#F8FAFC] border border-gray-200 rounded-2xl items-center justify-center shadow-xs">
                                                                            <Text className="text-xs font-lato-bold text-gray-700 uppercase tracking-wider">
                                                                                {RANGE_BASED_SUB_TYPES.has(activeType.subType)
                                                                                    ? `RANGE ${section.name}`
                                                                                    : (activeType.subType === 'plot' ? `ROW ${r}` : (activeType.subType === 'villa' || activeType.subType === 'rowhouse' ? `LANE ${r}` : `FL ${r}`))}
                                                                            </Text>
                                                                            <Text className="text-[9px] font-lato-bold text-gray-400 mt-1">
                                                                                {getRowUnitCount(section, r)} units
                                                                            </Text>
                                                                        </View>

                                                                        <View className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
                                                                            <TouchableOpacity
                                                                                onPress={() => handleAdjustRowUnits(r, 1, section.id)}
                                                                                className="w-10 h-8 items-center justify-center border-b border-gray-100"
                                                                            >
                                                                                <Ionicons name="add" size={16} color="#4A43EC" />
                                                                            </TouchableOpacity>
                                                                            <TouchableOpacity
                                                                                onPress={() => handleAdjustRowUnits(r, -1, section.id)}
                                                                                className="w-10 h-8 items-center justify-center"
                                                                            >
                                                                                <Ionicons name="remove" size={16} color="#EF4444" />
                                                                            </TouchableOpacity>
                                                                        </View>

                                                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1 flex-row gap-3">
                                                                            {Array.from({ length: getRowUnitCount(section, r) }, (_, i) => i + 1).map(c => {
                                                                                const key = `${r}_${c}`;
                                                                                const compositeKey = `${section.id}:${key}`;
                                                                                const isSelected = builderState.selectedUnitKey === compositeKey;
                                                                                const assignedCfgId = section.unitMap?.[key];
                                                                                const assignedCfg = section.configs?.find(cfg => cfg.id === assignedCfgId);
                                                                                const override = section.unitOverrides?.[key] || {};
                                                                                const displayNum = `${r}${c.toString().padStart(2, '0')}`;
                                                                                const label = override.customName || displayNum;
                                                                                const showBadge = Boolean(assignedCfg && /premium/i.test(`${assignedCfg.type || ''} ${assignedCfg.name || ''}`));

                                                                                return (
                                                                                    <TouchableOpacity
                                                                                        key={`${section.id}-${key}`}
                                                                                        onPress={() => handleCellClick(key, section.id)}
                                                                                        style={{
                                                                                            backgroundColor: isSelected ? '#4A43EC' : (assignedCfg ? assignedCfg.color : '#FFFFFF'),
                                                                                            borderColor: isSelected ? '#000000' : (assignedCfg ? assignedCfg.color : '#CBD5E1'),
                                                                                            borderWidth: isSelected ? 3 : (assignedCfg ? 0 : 1.5),
                                                                                            borderStyle: assignedCfg || isSelected ? 'solid' : 'dashed'
                                                                                        }}
                                                                                        className="w-28 h-16 rounded-2xl items-center justify-center mr-3 relative overflow-hidden shadow-xs"
                                                                                    >
                                                                                        <Text className={`text-xs font-lato-bold ${assignedCfg || isSelected ? 'text-white' : 'text-gray-400'}`} numberOfLines={1}>
                                                                                            {label}
                                                                                        </Text>
                                                                                        {assignedCfg ? (
                                                                                            <>
                                                                                                <Text className="text-[10px] font-lato-bold text-white/95 mt-0.5" numberOfLines={1}>
                                                                                                    {assignedCfg.type}
                                                                                                </Text>
                                                                                                <Text className="text-[9px] font-lato-bold text-white/90 uppercase tracking-wider mt-0.5" numberOfLines={1}>
                                                                                                    {override.customPrice ? `₹${override.customPrice}` : `₹${assignedCfg.price}`}
                                                                                                </Text>
                                                                                            </>
                                                                                        ) : (
                                                                                            <Text className="text-[9px] font-lato text-gray-300 mt-1 uppercase" numberOfLines={1}>
                                                                                                Unassigned
                                                                                            </Text>
                                                                                        )}

                                                                                        {showBadge && (
                                                                                            <View className="absolute top-0 right-0 w-4 h-4 bg-[#F59E0B] rounded-bl-lg items-center justify-center shadow-xs">
                                                                                                <Ionicons name="star" size={9} color="white" />
                                                                                            </View>
                                                                                        )}
                                                                                    </TouchableOpacity>
                                                                                );
                                                                            })}
                                                                        </ScrollView>
                                                                    </View>
                                                                ))}
                                                            </View>
                                                        );
                                                    })}

                                                    {/* Bottom Foundation Bar */}
                                                    <View className="bg-[#E2E8F0] h-6 rounded-xl mt-2 border border-gray-300 shadow-xs" />
                                                </View>

                                                {/* Selected Unit Override Card */}
                                                {builderState.selectedUnitKey && (() => {
                                                    const [sectionIdRaw, key] = builderState.selectedUnitKey.includes(':')
                                                        ? builderState.selectedUnitKey.split(':')
                                                        : [String(builderState.activeSectionId), builderState.selectedUnitKey];
                                                    const selectedSection = builderState.sections.find(sec => sec.id === parseInt(sectionIdRaw, 10));
                                                    if (!selectedSection) return null;

                                                    const [r, c] = key.split('_');
                                                    const assignedCfgId = selectedSection.unitMap?.[key];
                                                    const assignedCfg = selectedSection.configs?.find(cfg => cfg.id === assignedCfgId) || {};
                                                    const override = selectedSection.unitOverrides?.[key] || {};
                                                    const displayNum = `${r}${c.padStart(2, '0')}`;
                                                    const defaultPropNum = RANGE_BASED_SUB_TYPES.has(activeType.subType)
                                                        ? `${selectedSection.name || 'A'}-${c}`
                                                        : displayNum;
                                                    const selectedCompositeKey = `${selectedSection.id}:${key}`;

                                                    return (
                                                        <View className="bg-white border border-[#4A43EC] rounded-3xl p-6 shadow-md gap-4">
                                                            <View className="flex-row items-center justify-between border-b border-gray-100 pb-3">
                                                                <View>
                                                                    <Text className="text-sm font-lato-bold text-black">Customize Unit: {override.customName || defaultPropNum}</Text>
                                                                    <Text className="text-xs text-gray-500 font-lato mt-0.5">{RANGE_BASED_SUB_TYPES.has(activeType.subType) ? `Range ${selectedSection.name} • ` : ''}Base Variant: {assignedCfg.type || 'Unassigned'}</Text>
                                                                </View>
                                                                <TouchableOpacity onPress={() => handleUpdateBuilder(prev => ({ ...prev, selectedUnitKey: null }))}>
                                                                    <Ionicons name="close-circle" size={24} color="#9CA3AF" />
                                                                </TouchableOpacity>
                                                            </View>

                                                            <View className="gap-4">
                                                                <View>
                                                                    <Text className="text-xs font-lato-bold text-gray-500 mb-1.5">Custom Property Number</Text>
                                                                    <View className="bg-white border border-gray-200 rounded-xl px-4 h-12 justify-center">
                                                                        <TextInput
                                                                            className="text-sm text-gray-800 font-lato-medium"
                                                                            placeholder={defaultPropNum}
                                                                            value={override.customName || ''}
                                                                            onChangeText={v => handleUpdateOverride(selectedCompositeKey, 'customName', v)}
                                                                            style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                                                                        />
                                                                    </View>
                                                                </View>

                                                                <View className="flex-row gap-4">
                                                                    <View className="flex-1">
                                                                        <Text className="text-xs font-lato-bold text-gray-500 mb-1.5">Custom Area</Text>
                                                                        <View className="bg-white border border-gray-200 rounded-xl px-4 h-12 justify-center">
                                                                            <TextInput
                                                                                className="text-sm text-gray-800 font-lato-medium"
                                                                                placeholder={assignedCfg.area || '0'}
                                                                                keyboardType="numeric"
                                                                                value={override.customArea || ''}
                                                                                onChangeText={v => handleUpdateOverride(selectedCompositeKey, 'customArea', v)}
                                                                                style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                                                                            />
                                                                        </View>
                                                                    </View>
                                                                    <View className="flex-1">
                                                                        <Text className="text-xs font-lato-bold text-gray-500 mb-1.5">Custom Price (₹)</Text>
                                                                        <View className="bg-white border border-gray-200 rounded-xl px-4 h-12 justify-center">
                                                                            <TextInput
                                                                                className="text-sm text-gray-800 font-lato-medium"
                                                                                placeholder={assignedCfg.price || '0'}
                                                                                keyboardType="numeric"
                                                                                value={override.customPrice || ''}
                                                                                onChangeText={v => handleUpdateOverride(selectedCompositeKey, 'customPrice', v)}
                                                                                style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                                                                            />
                                                                        </View>
                                                                    </View>
                                                                </View>
                                                            </View>
                                                        </View>
                                                    );
                                                })()}
                                            </View>
                                        )}
                                    </View>

                                    {/* Summary Banner at Bottom */}
                                    <View className="bg-green-50 border border-green-200 rounded-2xl p-4 flex-row items-center gap-3 mt-4">
                                        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                                        <View className="flex-1">
                                            <Text className="text-xs font-lato-bold text-green-800">
                                                ✓ {configsList.length} units successfully generated & synced.
                                            </Text>
                                            <Text className="text-[10px] text-green-600 font-lato mt-0.5">
                                                Project Engine automatically maintains data structure for Step 4.
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

const FormSection = ({ title, children }) => (
    <View className="bg-white border border-gray-100 rounded-2xl p-4 gap-4">
        <Text className="text-sm font-lato-bold text-black">{title}</Text>
        {children}
    </View>
);

const OptionGroup = ({ label, options, value, onChange }) => (
    <View>
        {label ? <Text className="text-xs font-lato-bold text-black mb-2">{label}</Text> : null}
        <View className="flex-row flex-wrap gap-2">
            {options.map(option => (
                <TouchableOpacity
                    key={option}
                    onPress={() => onChange(option)}
                    className={`px-3 py-2 rounded-full border ${value === option ? 'bg-[#EBEAFF] border-[#4A43EC]' : 'bg-white border-gray-200'}`}
                >
                    <Text className={`text-[11px] font-lato-bold ${value === option ? 'text-[#4A43EC]' : 'text-gray-500'}`}>{option}</Text>
                </TouchableOpacity>
            ))}
        </View>
    </View>
);

const getInputTypeProps = (label = "", placeholder = "", keyboardType = "default") => {
    if (keyboardType !== "default") return { keyboardType };

    const text = `${label} ${placeholder}`.toLowerCase();
    if (text.includes("date") || text.includes("time")) {
        return {
            keyboardType: Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric",
            inputMode: "numeric",
        };
    }
    if (
        text.includes("amount") ||
        text.includes("price") ||
        text.includes("percentage") ||
        text.includes("number of months") ||
        text.includes("guideline year") ||
        text.includes("year") ||
        text.includes("contact") ||
        text.includes("pincode") ||
        text.includes("value")
    ) {
        return {
            keyboardType: "numeric",
            inputMode: "numeric",
        };
    }

    return { keyboardType: "default" };
};

const DatePickerField = ({ label, value, onChange }) => {
    const [show, setShow] = useState(false);

    const parsed = value ? new Date(value) : new Date();
    const isValid = value && !isNaN(parsed.getTime());

    const displayValue = isValid
        ? parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '';

    const handleChange = (event, selectedDate) => {
        setShow(Platform.OS === 'ios');
        if (event.type === 'dismissed') return;
        if (selectedDate) {
            const iso = selectedDate.toISOString().split('T')[0];
            onChange(iso);
        }
    };

    return (
        <View>
            <Text className="text-xs font-lato-bold text-black mb-1.5">{label}</Text>
            <TouchableOpacity
                onPress={() => setShow(true)}
                activeOpacity={0.8}
                className="bg-white border border-gray-200 rounded-xl px-4 h-12 flex-row items-center justify-between"
            >
                <Text className={`text-[13px] font-lato-medium ${displayValue ? 'text-gray-800' : 'text-[#9CA3AF]'}`}>
                    {displayValue || 'Select date'}
                </Text>
                <Ionicons name="calendar-outline" size={16} color="#4A43EC" />
            </TouchableOpacity>
            {show && (
                <DateTimePicker
                    value={isValid ? parsed : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleChange}
                />
            )}
        </View>
    );
};

const FieldInput = ({ label, value, onChangeText, placeholder, keyboardType = "default", multiline = false }) => {
    const inputRef = useRef(null);
    const inputTypeProps = getInputTypeProps(label, placeholder, keyboardType);
    return (
        <View>
            <Text className="text-xs font-lato-bold text-black mb-1.5">{label}</Text>
            <Pressable
                onPress={() => inputRef.current?.focus()}
                className={`bg-white border border-gray-200 rounded-xl px-4 ${multiline ? 'min-h-[88px] py-3' : 'h-12 justify-center'}`}
            >
                <TextInput
                    ref={inputRef}
                    className="text-[13px] text-gray-800 font-lato-medium"
                    placeholder={placeholder}
                    placeholderTextColor="#9CA3AF"
                    value={value}
                    keyboardType={inputTypeProps.keyboardType}
                    inputMode={inputTypeProps.inputMode}
                    multiline={multiline}
                    scrollEnabled={false}
                    returnKeyType={multiline ? "default" : "done"}
                    blurOnSubmit={!multiline}
                    onChangeText={onChangeText}
                    style={{ paddingVertical: 0, textAlignVertical: multiline ? 'top' : 'center', includeFontPadding: false }}
                />
            </Pressable>
        </View>
    );
};

const MultiCheckboxGroup = ({ label, options, values, onChange }) => {
    const toggle = (option) => {
        const nextValues = values.includes(option)
            ? values.filter(item => item !== option)
            : [...values, option];
        onChange(nextValues);
    };

    return (
        <View>
            <Text className="text-xs font-lato-bold text-black mb-2">{label}</Text>
            <View className="gap-2">
                {options.map(option => {
                    const selected = values.includes(option);
                    return (
                        <TouchableOpacity
                            key={option}
                            onPress={() => toggle(option)}
                            className="flex-row items-center gap-3"
                            activeOpacity={0.7}
                        >
                            <View
                                className="w-5 h-5 rounded border items-center justify-center"
                                style={{
                                    borderColor: selected ? "#4A43EC" : "#D1D5DB",
                                    backgroundColor: selected ? "#4A43EC" : "white"
                                }}
                            >
                                {selected && <Ionicons name="checkmark" size={14} color="white" />}
                            </View>
                            <Text className="text-xs text-gray-600 font-lato-medium flex-1">{option}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const DocumentUploadButton = ({ label, documents, onDocumentsPicked }) => {
    const projectId = useSelector((state) => state.project.projectId);
    const [isUploading, setIsUploading] = useState(false);

    const pickDocuments = async () => {
        if (!projectId) {
            alert('Please complete Step 1 before adding documents.');
            return;
        }

        const result = await DocumentPicker.getDocumentAsync({
            type: "*/*",
            multiple: true,
        });
        if (result.canceled) return;

        setIsUploading(true);
        try {
            const uploaded = await Promise.all(
                result.assets.map(async (asset) => {
                    const key = await uploadAssetToServer(projectId, asset, 'document');
                    return key ? { name: asset.name, uri: asset.uri, mimeType: asset.mimeType || '', size: asset.size || 0, key } : null;
                })
            );
            onDocumentsPicked([...(documents || []), ...uploaded.filter(Boolean)]);
        } catch (error) {
            console.error('Document upload error:', error);
            alert('Failed to upload one or more documents. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const openDocument = async (doc) => {
        const uri = doc.uri || doc.url;
        if (!uri) return;
        try {
            if (uri.startsWith('http')) {
                await Linking.openURL(uri);
            } else {
                await Sharing.shareAsync(uri, { mimeType: doc.mimeType || '*/*' });
            }
        } catch {
            alert('Could not open document.');
        }
    };

    const removeDocument = (index) => {
        const updated = (documents || []).filter((_, i) => i !== index);
        onDocumentsPicked(updated);
    };

    return (
        <View className="gap-2">
            <Text className="text-xs font-lato-bold text-black mb-1">{label}</Text>
            {(documents || []).map((doc, index) => (
                <TouchableOpacity
                    key={index}
                    onPress={() => openDocument(doc)}
                    className="flex-row items-center bg-[#F4F7FF] border border-[#4A43EC]/20 rounded-xl px-3 py-3 gap-2"
                    activeOpacity={0.7}
                >
                    <Ionicons name="document-text-outline" size={18} color="#4A43EC" />
                    <Text className="flex-1 text-xs font-lato-medium text-gray-700" numberOfLines={1}>
                        {doc.name || doc.label || `Document ${index + 1}`}
                    </Text>
                    <Ionicons name="eye-outline" size={15} color="#4A43EC" />
                    <TouchableOpacity onPress={() => removeDocument(index)} className="pl-2 py-1" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                </TouchableOpacity>
            ))}
            <TouchableOpacity
                onPress={pickDocuments}
                disabled={isUploading}
                className="bg-[#F4F7FF] border border-dashed border-[#4A43EC]/30 rounded-2xl py-4 items-center justify-center"
                style={{ opacity: isUploading ? 0.6 : 1 }}
            >
                <Ionicons name="document-attach-outline" size={20} color="#4A43EC" />
                <Text className="text-xs font-lato-bold text-[#4A43EC] mt-2">
                    {isUploading ? 'Uploading...' : (documents || []).length > 0 ? 'Add More Documents' : 'Upload Document'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

function ApprovalBlock({ title, approvalKey, options = APPROVAL_STATUS_OPTIONS, fields }) {
    const dispatch = useDispatch();
    const approval = useSelector((state) => state.project.step4.approvals[approvalKey]);
    const updateApproval = (data) => dispatch(updateStep4Approval({ approvalKey, data }));

    return (
        <View className="gap-4 border-t border-gray-100 pt-4">
            <Text className="text-xs font-lato-bold text-gray-500">{title}</Text>
            <OptionGroup
                label={fields.statusLabel}
                options={options}
                value={approval.status}
                onChange={(value) => updateApproval({ status: value })}
            />

            {approval.status === "Yes" && (
                <View className="gap-4">
                    {fields.yes.map(field => (
                        field.isDate ? (
                            <DatePickerField
                                key={field.key}
                                label={field.label}
                                value={approval[field.key]}
                                onChange={(value) => updateApproval({ [field.key]: value })}
                            />
                        ) : (
                            <FieldInput
                                key={field.key}
                                label={field.label}
                                placeholder={field.placeholder}
                                value={approval[field.key]}
                                keyboardType={field.keyboardType}
                                onChangeText={(value) => updateApproval({ [field.key]: value })}
                            />
                        )
                    ))}
                    <DocumentUploadButton
                        label={fields.documentLabel}
                        documents={approval.documents}
                        onDocumentsPicked={(documents) => updateApproval({ documents })}
                    />
                </View>
            )}

            {approval.status === "No" && (
                <View className="gap-4">
                    {fields.no.map(field =>
                        field.isOption ? (
                            <OptionGroup
                                key={field.key}
                                label={field.label}
                                options={field.options}
                                value={approval[field.key]}
                                onChange={(value) => updateApproval({ [field.key]: value })}
                            />
                        ) : field.isDate ? (
                            <DatePickerField
                                key={field.key}
                                label={field.label}
                                value={approval[field.key]}
                                onChange={(value) => updateApproval({ [field.key]: value })}
                            />
                        ) : (
                            <FieldInput
                                key={field.key}
                                label={field.label}
                                placeholder={field.placeholder}
                                value={approval[field.key]}
                                onChangeText={(value) => updateApproval({ [field.key]: value })}
                            />
                        )
                    )}
                </View>
            )}
        </View>
    );
}

function Step4() {
    const dispatch = useDispatch();
    const { step4 } = useSelector((state) => state.project);
    const updateField = (field, value) => dispatch(updateStep4({ [field]: value }));

    const normalizedApprovalStatuses = [
        step4.approvals.diversion.status,
        step4.approvals.tncp.status,
        step4.approvals.developmentPermission.status,
        step4.approvals.rera.status,
        step4.approvals.buildingPermission.status,
    ].filter(Boolean);
    const allCompleted = normalizedApprovalStatuses.length === 5 && normalizedApprovalStatuses.every(status => status === "Yes" || status === "Not Applicable");
    const somePending = normalizedApprovalStatuses.some(status => status === "No");
    const suggestedStatus = allCompleted ? "All approvals completed" : somePending ? "Some approvals pending" : "Not verified yet";

    useEffect(() => {
        if (step4.overallApprovalStatus === "Not verified yet" && suggestedStatus !== step4.overallApprovalStatus) {
            updateField("overallApprovalStatus", suggestedStatus);
        }
    }, [suggestedStatus, step4.overallApprovalStatus]);

    return (
        <View className="gap-5">
            <Text className="text-base font-lato-bold text-black">Approvals, Permissions & Project Progress</Text>

            <FormSection title="Possession Status">
                <OptionGroup
                    options={["Possession Completed", "Possession Pending"]}
                    value={step4.possessionStatus}
                    onChange={(value) => updateField("possessionStatus", value)}
                />
                {step4.possessionStatus === "Possession Pending" && (
                    <DatePickerField
                        label="Expected Possession Date"
                        value={step4.expectedPossessionDate}
                        onChange={(value) => updateField("expectedPossessionDate", value)}
                    />
                )}
                <FieldInput
                    label="Possession Remarks"
                    placeholder="Example: Possession expected after completion of final development work"
                    value={step4.possessionRemarks}
                    multiline
                    onChangeText={(value) => updateField("possessionRemarks", value)}
                />
            </FormSection>

            <FormSection title="Project Launch Status">
                <OptionGroup
                    options={["Already Launched", "Upcoming Launch"]}
                    value={step4.projectLaunchStatus}
                    onChange={(value) => updateField("projectLaunchStatus", value)}
                />
                {step4.projectLaunchStatus === "Already Launched" && (
                    <DatePickerField
                        label="Project Launch Date"
                        value={step4.projectLaunchDate}
                        onChange={(value) => updateField("projectLaunchDate", value)}
                    />
                )}
                {step4.projectLaunchStatus === "Upcoming Launch" && (
                    <DatePickerField
                        label="Expected Launch Date"
                        value={step4.expectedLaunchDate}
                        onChange={(value) => updateField("expectedLaunchDate", value)}
                    />
                )}
            </FormSection>

            <FormSection title="Development Progress">
                <FieldInput
                    label="Development Completion Percentage"
                    placeholder="Example: 65%"
                    keyboardType="numeric"
                    value={step4.developmentCompletionPercentage}
                    onChangeText={(value) => updateField("developmentCompletionPercentage", value)}
                />
                <MultiCheckboxGroup
                    label="Current Development Stage"
                    options={DEVELOPMENT_STAGE_OPTIONS}
                    values={step4.currentDevelopmentStage}
                    onChange={(value) => updateField("currentDevelopmentStage", value)}
                />
                {step4.currentDevelopmentStage.includes("Other") && (
                    <FieldInput
                        label="Other Development Stage"
                        placeholder="Mention current development stage"
                        value={step4.otherDevelopmentStage}
                        onChangeText={(value) => updateField("otherDevelopmentStage", value)}
                    />
                )}
                <FieldInput
                    label="Development Remarks"
                    placeholder="Add current development status or important remarks"
                    value={step4.developmentRemarks}
                    multiline
                    onChangeText={(value) => updateField("developmentRemarks", value)}
                />
            </FormSection>

            <FormSection title="Approvals & Permissions">
                <ApprovalBlock
                    title="A. Diversion Approval"
                    approvalKey="diversion"
                    fields={{
                        statusLabel: "Is Diversion Approved?",
                        yes: [
                            { key: "referenceNumber", label: "Diversion Order Number / Reference Number", placeholder: "Enter reference number" },
                            { key: "approvalDate", label: "Diversion Approval Date", isDate: true },
                        ],
                        no: [{ key: "expectedTime", label: "Expected Time to Receive Diversion Approval", isOption: true, options: ["3 months", "6 months", "12 months", "18 months", "24 months", "24+ months"] }],
                        documentLabel: "Upload Diversion Document",
                    }}
                />
                <ApprovalBlock
                    title="B. TNCP Approval"
                    approvalKey="tncp"
                    fields={{
                        statusLabel: "Is TNCP Approved?",
                        yes: [
                            { key: "approvalNumber", label: "TNCP Approval Number", placeholder: "Enter approval number" },
                            { key: "approvalDate", label: "TNCP Approval Date", isDate: true },
                        ],
                        no: [{ key: "expectedTime", label: "Expected Time to Receive TNCP Approval", isOption: true, options: ["3 months", "6 months", "12 months", "18 months", "24 months", "24+ months"] }],
                        documentLabel: "Upload TNCP Document",
                    }}
                />
                <ApprovalBlock
                    title="C. Development Permission"
                    approvalKey="developmentPermission"
                    fields={{
                        statusLabel: "Is Development Permission Approved?",
                        yes: [
                            { key: "permissionNumber", label: "Development Permission Number", placeholder: "Enter permission number" },
                            { key: "permissionDate", label: "Development Permission Date", isDate: true },
                        ],
                        no: [{ key: "expectedTime", label: "Expected Time to Receive Development Permission", isOption: true, options: ["3 months", "6 months", "12 months", "18 months", "24 months", "24+ months"] }],
                        documentLabel: "Upload Development Permission Document",
                    }}
                />
                <ApprovalBlock
                    title="D. RERA Approval"
                    approvalKey="rera"
                    options={OPTIONAL_APPROVAL_STATUS_OPTIONS}
                    fields={{
                        statusLabel: "Is the Project RERA Approved?",
                        yes: [
                            { key: "registrationNumber", label: "RERA Registration Number", placeholder: "Enter RERA registration number" },
                            { key: "registrationDate", label: "RERA Registration Date", isDate: true },
                        ],
                        no: [
                            { key: "reasonNotAvailable", label: "Reason for RERA Not Available", placeholder: "Mention reason" },
                            { key: "expectedTime", label: "Expected Time to Receive RERA Approval, if applicable", isOption: true, options: ["3 months", "6 months", "12 months", "18 months", "24 months", "24+ months"] },
                        ],
                        documentLabel: "Upload RERA Certificate",
                    }}
                />
                <ApprovalBlock
                    title="E. Building Permission"
                    approvalKey="buildingPermission"
                    options={OPTIONAL_APPROVAL_STATUS_OPTIONS}
                    fields={{
                        statusLabel: "Is Building Permission Approved?",
                        yes: [
                            { key: "permissionNumber", label: "Building Permission Number", placeholder: "Enter permission number" },
                            { key: "permissionDate", label: "Building Permission Date", isDate: true },
                        ],
                        no: [{ key: "expectedTime", label: "Expected Time to Receive Building Permission", isOption: true, options: ["3 months", "6 months", "12 months", "18 months", "24 months", "24+ months"] }],
                        documentLabel: "Upload Building Permission Document",
                    }}
                />
            </FormSection>

            <FormSection title="Approval Summary Status">
                <OptionGroup
                    label="Overall Approval Status"
                    options={OVERALL_APPROVAL_STATUS_OPTIONS}
                    value={step4.overallApprovalStatus}
                    onChange={(value) => updateField("overallApprovalStatus", value)}
                />
            </FormSection>
        </View>
    );
}

function Step5() {
    const dispatch = useDispatch();
    const { step5 } = useSelector((state) => state.project);
    const updateField = (field, value) => dispatch(updateStep5({ [field]: value }));

    return (
        <View className="gap-5">
            <Text className="text-base font-lato-bold text-black">Financial, Guideline & Ownership Verification</Text>

            <FormSection title="Government Guideline Value">
                <FieldInput label="Guideline Value Amount" placeholder="Example: Rs. 3,500 per sq. ft." keyboardType="numeric" value={step5.guidelineValueAmount} onChangeText={(value) => updateField("guidelineValueAmount", value)} />
                <OptionGroup label="Guideline Value Unit" options={GUIDELINE_VALUE_UNITS} value={step5.guidelineValueUnit} onChange={(value) => updateField("guidelineValueUnit", value)} />
                <FieldInput label="Property Jurisdiction / Area" placeholder="Enter jurisdiction / area" value={step5.propertyJurisdictionArea} onChangeText={(value) => updateField("propertyJurisdictionArea", value)} />
                <FieldInput label="Guideline Year" placeholder="Enter guideline year, if required" keyboardType="numeric" value={step5.guidelineYear} onChangeText={(value) => updateField("guidelineYear", value)} />
                <DocumentUploadButton label="Upload Guideline Reference Document" documents={step5.guidelineReferenceDocuments} onDocumentsPicked={(documents) => updateField("guidelineReferenceDocuments", documents)} />
            </FormSection>

            <FormSection title="Registry & Stamp Duty Details">
                <OptionGroup label="Registry Charges Available?" options={["Yes", "No"]} value={step5.registryChargesAvailable} onChange={(value) => updateField("registryChargesAvailable", value)} />
                {step5.registryChargesAvailable === "Yes" && (
                    <View className="gap-4">
                        <FieldInput label="Registry Charges for Male Buyer" placeholder="Percentage / amount" value={step5.registryChargesMaleBuyer} onChangeText={(value) => updateField("registryChargesMaleBuyer", value)} />
                        <FieldInput label="Registry Charges for Female Buyer" placeholder="Percentage / amount" value={step5.registryChargesFemaleBuyer} onChangeText={(value) => updateField("registryChargesFemaleBuyer", value)} />
                        <FieldInput label="Other Government Charges, if applicable" placeholder="Percentage / amount" value={step5.otherGovernmentCharges} onChangeText={(value) => updateField("otherGovernmentCharges", value)} />
                    </View>
                )}
            </FormSection>

            <FormSection title="Loan Availability">
                <OptionGroup label="Is Loan Available on this Project?" options={["Yes", "No"]} value={step5.loanAvailable} onChange={(value) => updateField("loanAvailable", value)} />
                {step5.loanAvailable === "Yes" && (
                    <View className="gap-4">
                        <OptionGroup label="Bank Tie-up Available?" options={["Yes", "No"]} value={step5.bankTieUpAvailable} onChange={(value) => updateField("bankTieUpAvailable", value)} />
                        <FieldInput label="Tie-up Bank Name" placeholder="Enter bank name" value={step5.tieUpBankName} onChangeText={(value) => updateField("tieUpBankName", value)} />
                        <FieldInput label="Loan Approval Status" placeholder="Enter loan approval status" value={step5.loanApprovalStatus} onChangeText={(value) => updateField("loanApprovalStatus", value)} />
                        <FieldInput label="Maximum Loan Percentage, if known" placeholder="Example: 80%" keyboardType="numeric" value={step5.maximumLoanPercentage} onChangeText={(value) => updateField("maximumLoanPercentage", value)} />
                        <FieldInput label="Required Documents for Loan, if any" placeholder="Mention required documents" multiline value={step5.requiredLoanDocuments} onChangeText={(value) => updateField("requiredLoanDocuments", value)} />
                        {step5.bankTieUpAvailable === "Yes" && (
                            <FieldInput label="Bank Name / Bank List" placeholder="Enter bank name / bank list" value={step5.bankNameList} onChangeText={(value) => updateField("bankNameList", value)} />
                        )}
                    </View>
                )}
            </FormSection>

            <FormSection title="Project Ownership Type">
                <OptionGroup label="Project Ownership Type" options={OWNERSHIP_TYPES} value={step5.ownershipType} onChange={(value) => updateField("ownershipType", value)} />
                {step5.ownershipType === "Owned Project" && (
                    <View className="gap-4">
                        <FieldInput label="Owner / Company Name" placeholder="Enter owner or company name" value={step5.ownedOwnerCompanyName} onChangeText={(value) => updateField("ownedOwnerCompanyName", value)} />
                        <DocumentUploadButton label="Ownership Document Upload" documents={step5.ownedDocuments} onDocumentsPicked={(documents) => updateField("ownedDocuments", documents)} />
                    </View>
                )}
                {step5.ownershipType === "Joint Venture Project" && (
                    <View className="gap-4">
                        <FieldInput label="Land Owner Name" placeholder="Enter land owner name" value={step5.jvLandOwnerName} onChangeText={(value) => updateField("jvLandOwnerName", value)} />
                        <FieldInput label="Developer / Builder Name" placeholder="Enter developer / builder name" value={step5.jvDeveloperBuilderName} onChangeText={(value) => updateField("jvDeveloperBuilderName", value)} />
                        <OptionGroup label="JV Agreement Available?" options={["Yes", "No"]} value={step5.jvAgreementAvailable} onChange={(value) => updateField("jvAgreementAvailable", value)} />
                        <DocumentUploadButton label="Upload JV Agreement, if available" documents={step5.jvAgreementDocuments} onDocumentsPicked={(documents) => updateField("jvAgreementDocuments", documents)} />
                        <FieldInput label="Revenue / Area Sharing Details" placeholder="Optional" multiline value={step5.jvRevenueAreaSharingDetails} onChangeText={(value) => updateField("jvRevenueAreaSharingDetails", value)} />
                    </View>
                )}
                {step5.ownershipType === "Development Agreement Project" && (
                    <View className="gap-4">
                        <FieldInput label="Land Owner Name" placeholder="Enter land owner name" value={step5.developmentLandOwnerName} onChangeText={(value) => updateField("developmentLandOwnerName", value)} />
                        <FieldInput label="Developer Name" placeholder="Enter developer name" value={step5.developmentDeveloperName} onChangeText={(value) => updateField("developmentDeveloperName", value)} />
                        <OptionGroup label="Development Agreement Available?" options={["Yes", "No"]} value={step5.developmentAgreementAvailable} onChange={(value) => updateField("developmentAgreementAvailable", value)} />
                        <DocumentUploadButton label="Upload Development Agreement" documents={step5.developmentAgreementDocuments} onDocumentsPicked={(documents) => updateField("developmentAgreementDocuments", documents)} />
                    </View>
                )}
                {step5.ownershipType === "Other" && (
                    <View className="gap-4">
                        <FieldInput label="Mention Ownership Type" placeholder="Enter ownership type" value={step5.otherOwnershipType} onChangeText={(value) => updateField("otherOwnershipType", value)} />
                        <DocumentUploadButton label="Upload Supporting Document" documents={step5.ownershipSupportingDocuments} onDocumentsPicked={(documents) => updateField("ownershipSupportingDocuments", documents)} />
                    </View>
                )}
            </FormSection>

            <FormSection title="Land / Project Title Verification">
                <OptionGroup label="Is Title Verification Completed?" options={["Yes", "No", "Under Process"]} value={step5.titleVerificationStatus} onChange={(value) => updateField("titleVerificationStatus", value)} />
                {step5.titleVerificationStatus === "Yes" && (
                    <View className="gap-4">
                        <FieldInput label="Title Verification Done By" placeholder="Enter verifier name / company" value={step5.titleVerificationDoneBy} onChangeText={(value) => updateField("titleVerificationDoneBy", value)} />
                        <DatePickerField
                            label="Title Verification Date"
                            value={step5.titleVerificationDate}
                            onChange={(value) => updateField("titleVerificationDate", value)}
                        />
                        <DocumentUploadButton label="Upload Title Report" documents={step5.titleReportDocuments} onDocumentsPicked={(documents) => updateField("titleReportDocuments", documents)} />
                    </View>
                )}
                {step5.titleVerificationStatus === "Under Process" && (
                    <DatePickerField
                        label="Expected Completion Date"
                        value={step5.titleExpectedCompletionDate}
                        onChange={(value) => updateField("titleExpectedCompletionDate", value)}
                    />
                )}
            </FormSection>

            <FormSection title="Financial Remarks">
                <FieldInput
                    label="Financial / Ownership Remarks"
                    placeholder="Add any important financial, guideline, loan, or ownership-related remarks"
                    multiline
                    value={step5.financialOwnershipRemarks}
                    onChangeText={(value) => updateField("financialOwnershipRemarks", value)}
                />
            </FormSection>
        </View>
    );
}

// --- Step 6 Component ---
function Step6() {
    const dispatch = useDispatch();
    const { step6 } = useSelector((state) => state.project);

    const updateField = (field, value) => {
        dispatch(updateStep6({ [field]: value }));
    };

    const pickImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            updateField('images', [...step6.images, ...result.assets]);
        }
    };

    const removeImage = (imageIndex) => {
        updateField('images', step6.images.filter((_, index) => index !== imageIndex));
    };

    const pickDocuments = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: "*/*",
            multiple: true,
        });

        if (!result.canceled) {
            updateField('documents', [...step6.documents, ...result.assets]);
        }
    };

    const Checkbox = ({ label, value, onValueChange }) => (
        <TouchableOpacity
            className="flex-row items-center gap-3 mb-4"
            onPress={() => onValueChange(!value)}
            activeOpacity={0.7}
        >
            <View
                className="w-5 h-5 rounded border items-center justify-center"
                style={{
                    borderColor: value ? "#4A43EC" : "#D1D5DB",
                    backgroundColor: value ? "#4A43EC" : "white"
                }}
            >
                {value && <Ionicons name="checkmark" size={14} color="white" />}
            </View>
            <Text className="text-xs text-gray-600 font-lato-medium flex-1">{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View className="gap-5">
            <Text className="text-base font-lato-bold text-black">Project Images & Submission</Text>

            {/* Image Upload */}
            <View className="mt-1">
                <Text className="text-xs font-lato-bold text-black mb-2.5">Upload Images for this project</Text>
                <TouchableOpacity
                    className="bg-[#F4F7FF] border border-dashed border-[#4A43EC]/30 rounded-2xl py-8 items-center justify-center"
                    onPress={pickImages}
                >
                    <View className="w-10 h-10 bg-[#EBEAFF] rounded-full items-center justify-center mb-2.5">
                        <Ionicons name="cloud-upload-outline" size={20} color="#4A43EC" />
                    </View>
                    <Text className="text-xs font-lato-bold text-[#4A43EC]">
                        {step6.images.length > 0 ? `${step6.images.length} Photos Added` : "Add at least 3 Photos"}
                    </Text>
                    <Text className="text-[9px] text-gray-400 font-lato mt-0.5">click from camera or browse to upload</Text>
                </TouchableOpacity>
                {step6.images.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
                        {step6.images.map((img, idx) => {
                            const imageSource = normalizeImageSource(img);
                            if (!imageSource) return null;
                            return (
                                <View key={`${imageSource.uri}-${idx}`} className="mr-2 relative">
                                    <Image source={imageSource} className="w-16 h-16 rounded-lg" />
                                    <TouchableOpacity
                                        onPress={() => removeImage(idx)}
                                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 items-center justify-center"
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="close" size={11} color="white" />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </ScrollView>
                )}
            </View>

            {/* Document Upload */}
            <View>
                <View className="flex-row items-center gap-1 mb-2.5">
                    <Text className="text-xs font-lato-bold text-black">Upload Project Documents</Text>
                    <Text className="text-[9px] text-gray-400 font-lato">(Optional)</Text>
                </View>
                <TouchableOpacity
                    className="bg-[#F4F7FF] border border-dashed border-[#4A43EC]/30 rounded-2xl py-8 items-center justify-center"
                    onPress={pickDocuments}
                >
                    <View className="w-10 h-10 bg-[#EBEAFF] rounded-full items-center justify-center mb-2.5">
                        <Ionicons name="document-text-outline" size={20} color="#4A43EC" />
                    </View>
                    <Text className="text-xs font-lato-bold text-[#4A43EC]">
                        {step6.documents.length > 0 ? `${step6.documents.length} Documents Added` : "Upload Documents"}
                    </Text>
                    <Text className="text-[9px] text-gray-400 font-lato mt-0.5">click from camera or browse to upload</Text>
                </TouchableOpacity>
            </View>

            {/* Agreement */}
            <View className="mt-2">
                <Text className="text-xs font-lato-bold text-black mb-3">Agreement & Submission</Text>
                <Checkbox
                    label="I confirm that the provided details are accurate and that I am the legal owner or have the right to list this property for sale."
                    value={step6.agreed}
                    onValueChange={(v) => updateField('agreed', v)}
                />
            </View>

        </View>
    );
}
