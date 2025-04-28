import os
import requests
import base64
from io import BytesIO
from PIL import Image as PILImage, ImageDraw
from IPython.display import display, HTML

def display_images(images, width=500, spacing=2):
    """
    Display one or multiple images in a Jupyter notebook with flexible input format.
    
    Parameters:
    - images: single image or list of images in various formats:
        - base64 encoded string
        - file path (str)
        - URL (str)
        - PIL Image object
        - bytes object
    - width: display width in pixels (default=500)
    - spacing: pixels of space between images when displaying multiple (default=10)
    """

    
    # Convert single image to list for uniform handling
    if not isinstance(images, list):
        images = [images]
    
    # Process each image to PIL format
    pil_images = []
    
    for img in images:
        if isinstance(img, PILImage.Image):
            # Already a PIL Image
            pil_images.append(img)
        elif isinstance(img, bytes):
            # Raw bytes data
            pil_images.append(PILImage.open(BytesIO(img)))
        elif isinstance(img, str):
            if img.startswith('http'):
                # URL
                response = requests.get(img, stream=True)
                response.raise_for_status()
                pil_images.append(PILImage.open(BytesIO(response.content)))
            elif os.path.exists(img):
                # File path
                pil_images.append(PILImage.open(img))
            else:
                # Try as base64
                try:
                    img_data = base64.b64decode(img)
                    pil_images.append(PILImage.open(BytesIO(img_data)))
                except Exception:
                    print(f"Could not process image: {img[:30]}...")
        else:
            print(f"Unsupported image format: {type(img)}")
    
    # Function to create a checkered background for transparent areas
    def create_checkered_background(width, height, square_size=10):
        background = PILImage.new('RGBA', (width, height), (255, 255, 255, 255))
        draw = ImageDraw.Draw(background)
        for i in range(0, width, square_size):
            for j in range(0, height, square_size):
                if (i//square_size + j//square_size) % 2 == 0:
                    draw.rectangle([i, j, i+square_size, j+square_size], fill=(200, 200, 200, 255))
        return background
    
    # Resize keeping aspect ratio and handle transparency
    resized_images = []
    for img in pil_images:
        # Convert to RGBA to ensure transparency handling
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        w, h = img.size
        new_h = int(width * h / w)
        resized_img = img.resize((width, new_h))
        
        # Create checkered background and paste image with transparency
        bg = create_checkered_background(width, new_h)
        bg.paste(resized_img, (0, 0), resized_img)
        resized_images.append(bg)
    
    # Display single image
    if len(resized_images) == 1:
        display(resized_images[0])
        return
    
    # For multiple images, display them side by side
    total_width = width * len(resized_images) + spacing * (len(resized_images) - 1)
    max_height = max(img.height for img in resized_images)
    
    # Create a blank canvas with solid white background (not checkered)
    combined = PILImage.new('RGB', (total_width, max_height), color=(255, 255, 255))
    
    # Paste images side by side with spacing
    x_offset = 0
    for img in resized_images:
        combined.paste(img, (x_offset, 0))
        x_offset += img.width + spacing
    
    # Display the combined image
    display(combined)