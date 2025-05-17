import logging
from fastapi import APIRouter, HTTPException, Depends 
# ... other imports like get_game, update_game, process_action, GameState ...

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/{game_id}/action")
async def execute_action_route(game_id: str, action: dict): # Renamed to avoid conflict
    logger.info(f"ROUTE: Received action for game {game_id}: {action.get('type', 'Unknown type')}")
    try:
        game_document = await get_game(game_id) # Assuming this returns the document from DB
        if not game_document:
            logger.error(f"ROUTE: Game not found for game_id: {game_id}")
            raise HTTPException(status_code=404, detail="Game not found.")

        # Assuming game_document is a dict and game_state is a Pydantic model or dict
        current_game_state = game_document["game_state"] # If it's already a Pydantic model instance

        # Log hero position before processing action
        if current_game_state.player and current_game_state.player.heroes:
             hero_for_log = current_game_state.player.heroes[0] # Example: log first hero
             logger.info(f"ROUTE: Hero {hero_for_log.id} position in game_state BEFORE action: {hero_for_log.position.x},{hero_for_log.position.y}")
        else:
            logger.info("ROUTE: No player heroes found in game_state before action.")

        # process_action should call the appropriate logic function (e.g., process_hero_movement)
        # That function will mutate current_game_state and return it in the result dict
        action_result = process_action(current_game_state, action) 

        updated_game_state_from_result = action_result.get("game_state")

        if not action_result.get("success", False):
            logger.warning(f"ROUTE: Action processing failed for game {game_id}. Error: {action_result.get('error')}")
            # Even if action failed, the logic function might have mutated game_state (e.g. to deduct resources for a failed build)
            # or it might return the original state. So, we save whatever game_state is in action_result.
            if updated_game_state_from_result:
                await update_game(game_id, updated_game_state_from_result)
                logger.info(f"ROUTE: Game {game_id} updated even after failed action, as game_state was present in result.")
            return action_result # Return the failure result

        if updated_game_state_from_result is None:
            logger.error("ROUTE: CRITICAL - 'game_state' missing from successful action_result. This should not happen.")
            # Fallback or raise error, this indicates a bug in the logic function
            raise HTTPException(status_code=500, detail="Internal server error: Game state missing after action processing.")
        
        # Log hero position after processing action, before saving
        if updated_game_state_from_result.player and updated_game_state_from_result.player.heroes:
            hero_for_log_after = updated_game_state_from_result.player.heroes[0]
            logger.info(f"ROUTE: Hero {hero_for_log_after.id} position in game_state AFTER action (before save): {hero_for_log_after.position.x},{hero_for_log_after.position.y}")
        else:
            logger.info("ROUTE: No player heroes found in game_state after action.")

        # Save the mutated game_state (which is updated_game_state_from_result)
        await update_game(game_id, updated_game_state_from_result)
        logger.info(f"ROUTE: Game {game_id} state saved successfully after action.")
        
        # The action_result already contains the updated game_state
        return action_result

    except HTTPException as http_exc:
        logger.error(f"ROUTE: HTTPException in execute_action for game {game_id}: {http_exc.detail}")
        raise http_exc
    except Exception as e:
        logger.exception(f"ROUTE: Unexpected error in execute_action for game {game_id}") # Logs stack trace
        raise HTTPException(status_code=500, detail="An unexpected server error occurred.")
