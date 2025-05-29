use_case_prompts = {
    "Custom": {
        "Custom": ""
    },
    "Commercials": {
        "Feature XBox brand": """A close-up animated shot focusing on enthusiastic male and female gamers wearing hats with the Xbox brand-logo, with dynamic lighting highlighting the detailed design in a sleek, cinematic frame.""",

        "Food advertising": """A mouth-watering display of gourmet food, artfully arranged on a rustic table, shot with a close-up lens highlighting vibrant colors and textures.""",

        "Iced coffee slow motion": """A high-quality, ultra-realistic cinematic animation of an iced coffee drink on a rustic wooden table, surrounded by coffee beans. The layers of coffee, milk, and syrup slowly mix together in slow motion. Ice cubes glisten under warm sunlight, giving a refreshing feeling. The scene is dreamy, artistic, and aesthetic, inspired by high-end beverage advertisements. Soft bokeh background, perfect lighting, ultra-HD, cinematic film look.""",

        "Brand logo explosion": """Microsoft brand logo transforms into bright colorful paint in the form of powder explodes and flies in different directions, forming a variety of patterns and settling, 3d rendering.""",

        "Perfume advertising": """A woman in a flowing silk gown walks through a blooming lavender field at sunset. The golden light accentuates her elegance as she gently touches the flowers. She pauses, closes her eyes, and inhales deeply, savoring the scent. The camera captures close-ups of her serene expression and the perfume bottle in her hand, glistening in the sunlight.
Film Shooting Details:
Lighting: Utilize the warm, diffused light of the golden hour to create a soft, romantic atmosphere.
Camera Angles: Employ a mix of wide shots to showcase the expansive lavender fields and close-ups to capture the model's expressions and the perfume bottle's details.
Movement: Incorporate slow-motion sequences to emphasize the model's graceful movements and the gentle sway of the lavender.
Props: Feature a beautifully designed perfume bottle that complements the scene's aesthetic."""

    },
    "Film Promo": {
        "Fluffy monster with candle": """Animated scene features a close-up of a short fluffy monster kneeling beside a melting red candle. The art style is 3D and realistic, with a focus on lighting and texture. The mood of the painting is one of wonder and curiosity, as the monster gazes at the flame with wide eyes and open mouth. Its pose and expression convey a sense of innocence and playfulness, as if it is exploring the world around it for the first time."""
    },
    "Coolstuff": {
        "Cyberpunk eye reflection": """A hyper-detailed close-up of a human eye, reflecting a futuristic cyberpunk city with glowing neon lights and holograms. The eye moves slightly, blinking occasionally, while the lights in the reflection shift and flicker. The scene is cinematic, with rich textures, realistic lighting, and a sci-fi atmosphere similar to Blade Runner. The depth of field is shallow, focusing on the intricate details of the eye and the illuminated cityscape within it. The color palette includes deep blues, warm oranges, and bright neon accents, creating a mesmerizing and surreal visual effect. 4K. Frame rate: 24-30 FPS for a cinematic look.""",

        "Steampunk victorian woman": """A steampunk-inspired cityscape, a woman in Victorian attire navigates cobblestone streets illuminated by gas lamps. She enters a workshop filled with whirring gears and steam-powered machinery. Close-ups capture her confident gaze. 
Film Shooting Details:
Lighting: Utilize warm, amber tones from gas lamps and steam to create a nostalgic, industrial ambiance.
Camera Angles: Employ wide shots to showcase the detailed steampunk environment and close-ups to highlight the model's attire 
Movement: Incorporate steady tracking shots to follow the model's journey through the mechanical setting, emphasizing the fusion of elegance and machinery."""
    },
}

filename_system_message = """
You generate a concise filename for a mp4 video file based on a text prompt that was used to generate the video
Ensure that only allowed characters are used for the filename and do not add a file extension.
User underscores instead of spaces.
Provide the result as a valid JSON object in this format:
{
  "filename" : "<concise video file name without extension>"
}
"""

analyze_video_system_message = """You are an expert in analyzing videos.
You are provided with extracted frames from a video. Each frame includes a timestamp in the format 'mm:ss:msec'. Use these timestamps to understand the progression and structure of the video.
Your task is to extract the following:
1. summary of the video's content and narrative
2. named brands or named products visible in the scenes
3. video metadata tags useful for organizing and searching video content in large libraries. Limit to the 5 most relevant tags.
4. feedback to improve the video

For metadata tags, include:
- visual elements (e.g., bright colors, muted tones, dominant color, black and white, etc.)
- time context (e.g., day, night, morning, dusk)
- location context if obvious (e.g., indoors, outdoors, beach, office, street)
- people or activities (e.g., group conversation, solo presenter, walking, driving, cooking)
- mood and style (e.g., energetic, calm, dramatic, cinematic, documentary-style)
- any notable scene types (e.g., product close-up, logo reveal, landscape shot, action scene)

Return the result as a valid JSON object:
{{
    "summary": "<Brief summary of the video's content and narrative>",
    "products": "<named brands / named products identified>",
    "tags": "<Array of max. 5 general metadata tags for search purposes>",
    "feedback": "<Feedback about the video including suggestions for improvement>"
}}
"""
