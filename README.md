# Visionary Lab

**Create high-quality visual content with the gpt-image-1 model on Azure OpenAI—tailored for professional use cases.**

## Key Features
- Generate polished image assets from text prompts, input images, or both
- Refine prompts using AI best practices to ensure high-impact visuals
- Analyze outputs with AI for quality control, metadata tagging, and asset optimization
- Manage your content in an organized asset library

<img src="ui-sample.png" alt="description" width="800"/>

> Note: You can also use the [notebook](notebooks/gpt-image-1.ipynb) if you want to explore gpt-image-1 using the API.

## Requirements

Azure resources:
- Azure OpenAI resource with deployed `gpt-image-1` model
- Azure OpenAI `gpt-4.1` model deployment 
- Azure Storage Account with a Blob Container for your images. You can use virtual folders to organize your content.

Compute environment:
- Python 3.12+ 
- Node.js 19+ and npm
- Git

## 1. Clone the Repository

```bash
git clone https://github.com/Azure-Samples/visionary-lab
```
Alternatively, you can get started quickly using Codespaces directly on the GitHub repository.

   
## 2. Backend Setup

### 2.1 Install UV Package Manager

UV is a fast Python package installer and resolver that we use for managing dependencies.

#### Mac/Linux
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

#### Windows
```powershell
# Using PowerShell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### 2.2 Configure Environment Variables

```bash
# Copy the template environment file
cd backend
cp .env.example .env
```

Now open the `.env` file in your editor and fill in the required credentials:
- Azure OpenAI keys (`AOAI_RESOURCE`, `AOAI_API_KEY`, etc.)
- Azure Storage account details

### 2.3 Run Backend

#### Using UV (Recommended)
```bash
# Create and activate a new virtual environment
uv run fastapi dev
```
The backend server will start on http://localhost:8000. You can verify it's running by visiting http://localhost:8000/api/v1/health in your browser.

__Note:__ If you encounter the following error: `ImportError: libGL.so.1: cannot open shared object file: No such file or directory`  
In this case, your system is missing the shared `libGL.so.1` library which is required by OpenCV.  
On a Linux system, you can install the missing library as follows:
```bash
sudo apt update
sudo apt install libgl1-mesa-glx
```

## 3. Frontend Setup

### 3.1 Navigate to the Frontend Directory

```bash
cd frontend
```

### 3.2 Install Dependencies

```bash
# Install dependencies with legacy peer deps flag to avoid compatibility issues
npm install --legacy-peer-deps
```

### 3.3 Run the Development Server

```bash
npm run dev
```

The frontend will be available at http://localhost:3000.


## 4. Next Steps

Once both the backend and frontend are running, you can:

1. Visit http://localhost:3000 to access the main application
2. Use the API documentation at http://localhost:8000/docs to explore available endpoints
