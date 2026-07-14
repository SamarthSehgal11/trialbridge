import re
from datetime import datetime, date
from typing import Optional


# ---------------------------------------------------------------------------
# Geolocation coordinate mapping for common clinical trial center locations
# ---------------------------------------------------------------------------
CITY_COORDINATES = {
    "boston": (42.3601, -71.0589),
    "new york": (40.7128, -74.0060),
    "chicago": (41.8781, -87.6298),
    "san francisco": (37.7749, -122.4194),
    "los angeles": (34.0522, -118.2437),
    "london": (51.5074, -0.1278),
    "paris": (48.8566, 2.3522),
    "seoul": (37.5665, 126.9780),
    "tokyo": (35.6762, 139.6503),
    "marseille": (43.2965, 5.3698),
    "bethesda": (38.9847, -77.0947),
    "baltimore": (39.2904, -76.6122),
    "philadelphia": (39.9526, -75.1652),
    "seattle": (47.6062, -122.3321),
    "atlanta": (33.7490, -84.3880),
    "houston": (29.7604, -95.3698),
    "toronto": (43.6532, -79.3832),
    "sydney": (-33.8688, 151.2093),
    "melbourne": (-37.8136, 144.9631),
    "munich": (48.1351, 11.5820),
    "berlin": (52.5200, 13.4050),
    "singapore": (1.3521, 103.8198),
}


def calculate_days_remaining(completion_date_str: str) -> Optional[int]:
    if not completion_date_str or "unknown" in completion_date_str.lower():
        return None

    completion_date_str = completion_date_str.strip()

    # 1. Try parsing YYYY-MM-DD
    match_ymd = re.match(r'^(\d{4})-(\d{2})-(\d{2})$', completion_date_str)
    if match_ymd:
        try:
            target = datetime.strptime(completion_date_str, "%Y-%m-%d").date()
            return (target - date.today()).days
        except ValueError:
            pass

    # 2. Try parsing YYYY-MM
    match_ym = re.match(r'^(\d{4})-(\d{2})$', completion_date_str)
    if match_ym:
        try:
            year = int(match_ym.group(1))
            month = int(match_ym.group(2))
            if month == 12:
                target = date(year + 1, 1, 1)
            else:
                target = date(year, month + 1, 1)
            return (target - date.today()).days
        except ValueError:
            pass

    # 3. Try Month YYYY (e.g. "December 2026")
    match_my = re.match(r'^([a-zA-Z]+)\s+(\d{4})$', completion_date_str)
    if match_my:
        try:
            months = [
                "january", "february", "march", "april", "may", "june",
                "july", "august", "september", "october", "november", "december",
            ]
            m_str = match_my.group(1).lower()
            year = int(match_my.group(2))
            if m_str in months:
                month = months.index(m_str) + 1
                if month == 12:
                    target = date(year + 1, 1, 1)
                else:
                    target = date(year, month + 1, 1)
                return (target - date.today()).days
        except ValueError:
            pass

    return None


def check_eligibility(
    study: dict,
    age: Optional[int] = None,
    gender: Optional[str] = None,
    prior_treatments: Optional[str] = None,
    current_meds: Optional[str] = None,
    healthy: Optional[bool] = None,
    metastasis: Optional[bool] = None,
) -> dict:
    res = {"eligible": True, "reasons": []}

    eligibility_criteria = study.get("eligibilityCriteria", "")

    # 1. Age
    if age is not None:
        min_age_str = study.get("minAgeStr", "")
        max_age_str = study.get("maxAgeStr", "")

        def parse_age_to_years(age_str: str) -> Optional[float]:
            if not age_str:
                return None
            val_match = re.search(r'(\d+)\s+(Year|Month|Day|Week)', age_str, re.IGNORECASE)
            if val_match:
                val = float(val_match.group(1))
                unit = val_match.group(2).lower()
                if "year" in unit:
                    return val
                elif "month" in unit:
                    return val / 12.0
                elif "week" in unit:
                    return val / 52.0
                elif "day" in unit:
                    return val / 365.0
            num_match = re.search(r'(\d+)', age_str)
            if num_match:
                return float(num_match.group(1))
            return None

        min_age_val = parse_age_to_years(min_age_str)
        max_age_val = parse_age_to_years(max_age_str)

        if min_age_val is not None and age < min_age_val:
            res["eligible"] = False
            res["reasons"].append(f"Age {age} is below minimum requirement ({min_age_str})")
        if max_age_val is not None and age > max_age_val:
            res["eligible"] = False
            res["reasons"].append(f"Age {age} exceeds maximum limit ({max_age_str})")

    # 2. Gender
    gender_api = study.get("genderApi", "ALL").upper()
    if gender and gender.upper() != "ALL":
        if gender_api != "ALL" and gender.upper() != gender_api:
            res["eligible"] = False
            res["reasons"].append(f"Trial restricted to {gender_api.lower()} participants")

    # 3. Healthy Volunteers
    healthy_api = study.get("healthyVolunteersApi", "").upper()
    if healthy is not None:
        if healthy:
            if healthy_api == "NOT_ACCEPTABLE":
                res["eligible"] = False
                res["reasons"].append("Trial excludes healthy volunteers")
        else:
            if healthy_api == "ACCEPTABLE" and not study.get("conditions"):
                res["eligible"] = False
                res["reasons"].append("Trial is for healthy control volunteers only")

    # NLP inclusion/exclusion parsing
    if eligibility_criteria:
        inclusion_text = ""
        exclusion_text = ""
        lower_c = eligibility_criteria.lower()

        idx_inc = lower_c.find("inclusion criteria")
        idx_exc = lower_c.find("exclusion criteria")

        if idx_inc != -1 and idx_exc != -1:
            if idx_inc < idx_exc:
                inclusion_text = eligibility_criteria[idx_inc + len("inclusion criteria"):idx_exc]
                exclusion_text = eligibility_criteria[idx_exc + len("exclusion criteria"):]
            else:
                exclusion_text = eligibility_criteria[idx_exc + len("exclusion criteria"):idx_inc]
                inclusion_text = eligibility_criteria[idx_inc + len("inclusion criteria"):]
        elif idx_inc != -1:
            inclusion_text = eligibility_criteria[idx_inc + len("inclusion criteria"):]
        elif idx_exc != -1:
            exclusion_text = eligibility_criteria[idx_exc + len("exclusion criteria"):]
        else:
            inclusion_text = eligibility_criteria
            exclusion_text = eligibility_criteria

        def is_excluded_by_keyword(kw: str, text: str) -> bool:
            patterns = [
                rf"\b(prior|previous|history of|former|treatment with|use of)\b.*?\b{re.escape(kw)}\b",
                rf"\b{re.escape(kw)}\b.*?\b(excluded|not permitted|prohibited|exclusion)\b",
                rf"\b(exclude|exclusion|no)\b.*?\b{re.escape(kw)}\b",
            ]
            for pat in patterns:
                if re.search(pat, text, re.IGNORECASE):
                    return True
            if kw.lower() in text.lower():
                return True
            return False

        if prior_treatments:
            kws = [k.strip() for k in prior_treatments.split(",") if k.strip()]
            for kw in kws:
                if is_excluded_by_keyword(kw, exclusion_text):
                    res["eligible"] = False
                    res["reasons"].append(f"Excluded due to prior treatment: {kw}")

        if current_meds:
            kws = [k.strip() for k in current_meds.split(",") if k.strip()]
            for kw in kws:
                if kw.lower() in exclusion_text.lower():
                    res["eligible"] = False
                    res["reasons"].append(f"Excluded due to current medication: {kw}")

        if metastasis is not None:
            if metastasis:
                metastasis_exclusion_terms = ["metastases", "metastatic", "secondaries"]
                for term in metastasis_exclusion_terms:
                    brain_met_pattern = rf"\b(brain|cns|leptomeningeal|active)\b.*?\b{re.escape(term)}\b"
                    if re.search(brain_met_pattern, exclusion_text, re.IGNORECASE):
                        res["eligible"] = False
                        res["reasons"].append("Excluded due to active/brain metastases")
                        break
            else:
                metastasis_required_terms = [
                    "metastatic disease required",
                    "must have metastatic",
                    "recurrent or metastatic",
                ]
                for term in metastasis_required_terms:
                    if term in inclusion_text.lower():
                        res["eligible"] = False
                        res["reasons"].append("Trial requires metastatic disease")
                        break

    return res


def parse_study(study: dict, match_score: Optional[int] = None) -> dict:
    protocol = study.get("protocolSection", {})
    id_mod = protocol.get("identificationModule", {})
    status_mod = protocol.get("statusModule", {})
    sponsor_mod = protocol.get("sponsorCollaboratorsModule", {})
    design_mod = protocol.get("designModule", {})
    conditions_mod = protocol.get("conditionsModule", {})
    eligibility_mod = protocol.get("eligibilityModule", {})
    contacts_mod = protocol.get("contactsLocationsModule", {})

    nct_id = id_mod.get("nctId", "")
    title = id_mod.get("briefTitle") or id_mod.get("officialTitle") or "Untitled Study"
    official_title = id_mod.get("officialTitle") or title
    sponsor = sponsor_mod.get("leadSponsor", {}).get("name", "Unknown Sponsor")

    # Phase Extraction
    phases = design_mod.get("phases", [])
    phase = phases[0] if phases else "NA"
    phase_mapping = {
        "PHASE1": "Phase I",
        "PHASE2": "Phase II",
        "PHASE3": "Phase III",
        "PHASE4": "Phase IV",
        "EARLY_PHASE1": "Phase I",
        "PHASE1_PHASE2": "Phase I/II",
        "PHASE2_PHASE3": "Phase II/III",
    }
    phase_display = phase_mapping.get(phase.upper(), "Phase NA") if phase else "Phase NA"

    # Status Extraction
    status = status_mod.get("overallStatus", "UNKNOWN")
    status_mapping = {
        "RECRUITING": "Recruiting",
        "ACTIVE_NOT_RECRUITING": "Active",
        "COMPLETED": "Completed",
        "ENROLLING_BY_INVITATION": "Enrolling by Invitation",
        "SUSPENDED": "Suspended",
        "TERMINATED": "Terminated",
        "WITHDRAWN": "Withdrawn",
        "NOT_YET_RECRUITING": "Active",
    }
    status_display = status_mapping.get(status.upper(), status.replace("_", " ").title())

    # Location and Coordinate Extraction
    locations = contacts_mod.get("locations", [])
    location_display = "Multi-center"
    latitude = None
    longitude = None
    if locations:
        loc = locations[0]
        city = loc.get("city", "")
        country = loc.get("country", "")
        if city and country:
            location_display = f"{city}, {country}"
        elif country:
            location_display = country

        if city:
            city_lower = city.lower().strip()
            found_coord = False
            for c_key, coords in CITY_COORDINATES.items():
                if c_key in city_lower:
                    latitude, longitude = coords
                    found_coord = True
                    break

            if not found_coord:
                h = hash(city)
                latitude = 32.0 + abs(h % 15)
                longitude = -115.0 + abs(h % 45)

    # Eligibility Criteria Summarization
    criteria = eligibility_mod.get("eligibilityCriteria", "")
    eligibility_summary = "No specific criteria listed."
    if criteria:
        lines = [line.strip() for line in criteria.split("\n") if line.strip()]
        valid_lines = [
            l for l in lines
            if not any(x in l.lower() for x in ["inclusion", "exclusion", "criteria"])
        ][:2]
        if valid_lines:
            eligibility_summary = " ".join(valid_lines)
            if len(eligibility_summary) > 150:
                eligibility_summary = eligibility_summary[:147] + "..."
        else:
            eligibility_summary = criteria[:150] + "..."

    # Start and End Dates
    start_date = status_mod.get("startDateStruct", {}).get("date", "Unknown Start")
    completion_date = (
        status_mod.get("completionDateStruct", {}).get("date")
        or status_mod.get("primaryCompletionDateStruct", {}).get("date")
        or "Unknown End"
    )

    # Contact Extraction
    contacts = []
    central_contacts = contacts_mod.get("centralContacts", [])
    for c in central_contacts:
        name = c.get("name", "")
        phone = c.get("phone", "")
        email = c.get("email", "")
        if name or phone or email:
            contacts.append({"name": name, "phone": phone, "email": email})

    if not contacts and locations:
        for loc in locations:
            loc_contacts = loc.get("contacts", [])
            for c in loc_contacts:
                name = c.get("name", "")
                phone = c.get("phone", "")
                email = c.get("email", "")
                if name or phone or email:
                    contacts.append({"name": name, "phone": phone, "email": email})
                    break
            if contacts:
                break

    # Demographics
    std_ages = eligibility_mod.get("stdAges", [])
    conditions = conditions_mod.get("conditions", [])
    min_age_str = eligibility_mod.get("minimumAge", "")
    max_age_str = eligibility_mod.get("maximumAge", "")
    gender_api = eligibility_mod.get("gender", "ALL")
    healthy_volunteers_api = eligibility_mod.get("healthyVolunteers", "")

    # Timeline Urgent Status
    days_rem = calculate_days_remaining(completion_date)
    closing_soon = None
    if days_rem is not None:
        if 0 <= days_rem <= 30:
            closing_soon = "30 days"
        elif 0 <= days_rem <= 60:
            closing_soon = "60 days"
        elif 0 <= days_rem <= 90:
            closing_soon = "90 days"

    return {
        "nctId": nct_id,
        "title": title,
        "officialTitle": official_title,
        "sponsor": sponsor,
        "phase": phase_display,
        "status": status_display,
        "location": location_display,
        "latitude": latitude,
        "longitude": longitude,
        "eligibilitySummary": eligibility_summary,
        "eligibilityCriteria": criteria,
        "startDate": start_date,
        "completionDate": completion_date,
        "contacts": contacts,
        "conditions": conditions,
        "stdAges": std_ages,
        "minAgeStr": min_age_str,
        "maxAgeStr": max_age_str,
        "genderApi": gender_api,
        "healthyVolunteersApi": healthy_volunteers_api,
        "daysRemaining": days_rem,
        "closingSoonStatus": closing_soon,
        "matchScore": match_score,
    }
