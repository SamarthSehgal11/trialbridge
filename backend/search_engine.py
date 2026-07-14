import logging
import math
from sentence_transformers import SentenceTransformer, CrossEncoder, util

logger = logging.getLogger("trialbridge-search")

# Global model variables
model = None
cross_model = None

def init_model():
    global model, cross_model
    if model is None:
        logger.info("Initializing SentenceTransformer model 'all-MiniLM-L6-v2'...")
        try:
            model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Bi-Encoder model loaded successfully.")
        except Exception as e:
            logger.error(f"Error loading Bi-Encoder model: {e}")
            raise e
            
    if cross_model is None:
        import os
        local_path = os.path.join(os.path.dirname(__file__), "models", "ms-marco-MiniLM-L-6-v2")
        if os.path.exists(local_path):
            logger.info(f"Initializing CrossEncoder model from local path '{local_path}'...")
            try:
                cross_model = CrossEncoder(local_path)
                logger.info("Cross-Encoder model loaded successfully from local path.")
            except Exception as e:
                logger.error(f"Error loading local Cross-Encoder model: {e}")
                raise e
        else:
            logger.info("Initializing CrossEncoder model 'cross-encoder/ms-marco-MiniLM-L-6-v2' from HF...")
            try:
                cross_model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
                logger.info("Cross-Encoder model loaded successfully from HF.")
            except Exception as e:
                logger.error(f"Error loading Cross-Encoder model from HF: {e}")
                raise e

def compute_similarity(query: str, studies: list) -> list:
    """
    Computes semantic similarity using a two-stage re-ranking approach:
    1. First-Stage: Bi-Encoder cosine similarity for fast candidate sorting.
    2. Second-Stage: Cross-Encoder pair classification for top candidates (up to 40).
    """
    if not studies:
        return []
    
    global model, cross_model
    if model is None or cross_model is None:
        init_model()
        
    # Build text descriptions for each trial
    study_texts = []
    for study in studies:
        protocol = study.get("protocolSection", {})
        
        # Identification
        id_mod = protocol.get("identificationModule", {})
        brief_title = id_mod.get("briefTitle", "")
        official_title = id_mod.get("officialTitle", "")
        
        # Description
        desc_mod = protocol.get("descriptionModule", {})
        brief_summary = desc_mod.get("briefSummary", "")
        
        # Conditions
        cond_mod = protocol.get("conditionsModule", {})
        conditions = ", ".join(cond_mod.get("conditions", []))
        
        # Eligibility
        eligibility = protocol.get("eligibilityModule", {})
        criteria = eligibility.get("eligibilityCriteria", "")
        
        # Compose trial text
        text = f"Trial: {brief_title}. Conditions: {conditions}. Summary: {brief_summary}. Eligibility: {criteria[:400]}"
        study_texts.append(text)
        
    try:
        # 1. First Stage: Bi-Encoder Candidate Retrieval
        query_embedding = model.encode(query, convert_to_tensor=True)
        study_embeddings = model.encode(study_texts, convert_to_tensor=True)
        cosine_scores = util.cos_sim(query_embedding, study_embeddings)[0]
        
        ranked_studies = []
        for i, study in enumerate(studies):
            bi_score = cosine_scores[i].item()
            # Cache the Bi-Encoder score for sorting
            study["biScore"] = bi_score
            ranked_studies.append(study)
            
        # Sort by Bi-Encoder score to find candidates
        ranked_studies.sort(key=lambda x: x["biScore"], reverse=True)
        
        # Limit candidate pool for intensive Cross-Encoder re-ranking to top 40
        candidates = ranked_studies[:40]
        remaining = ranked_studies[40:]
        
        # 2. Second Stage: Cross-Encoder Re-ranking
        if candidates:
            # Pair query with study content
            pairs = []
            for study in candidates:
                protocol = study.get("protocolSection", {})
                desc_mod = protocol.get("descriptionModule", {})
                brief_summary = desc_mod.get("briefSummary", "")
                eligibility = protocol.get("eligibilityModule", {})
                criteria = eligibility.get("eligibilityCriteria", "")
                
                # Combine summary and eligibility for deep comparison
                content = f"Summary: {brief_summary}. Criteria: {criteria[:1000]}"
                pairs.append([query, content])
                
            # Predict Cross-Encoder similarity logit scores
            cross_scores = cross_model.predict(pairs)
            
            for idx, study in enumerate(candidates):
                raw_score = float(cross_scores[idx])
                
                # Sigmoid function maps raw score logit (-5 to +3) to range [0.0, 1.0]
                # Center and scale: a score of 0.0 logit is mapped to ~50%
                # Use scale factor of 0.7 to spread out the distribution nicely
                sigmoid_val = 1.0 / (1.0 + math.exp(-0.7 * raw_score))
                match_percentage = int(sigmoid_val * 100)
                
                # Clamp match percentage between 10% and 98%
                study["matchScore"] = max(10, min(98, match_percentage))
                
        # For remaining studies, map Bi-Encoder score as fallback
        for study in remaining:
            score = study["biScore"]
            if score >= 0.7:
                match_score = int(85 + (score - 0.7) * 40)
            elif score >= 0.4:
                match_score = int(45 + (score - 0.4) * 133)
            else:
                match_score = int(max(10, score * 100))
            study["matchScore"] = max(10, min(80, match_score)) # Cap fallback below top
            
        # Re-sort full list by final matchScore in descending order
        all_results = candidates + remaining
        all_results.sort(key=lambda x: x["matchScore"], reverse=True)
        
        # Truncate to top 50 overall results for performance
        return all_results[:50]
        
    except Exception as e:
        logger.error(f"Error computing two-stage similarity: {e}")
        # Default fallback: return studies with a default match score
        for study in studies:
            study["matchScore"] = 50
        return studies

