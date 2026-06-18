import os
import time

import requests
import streamlit as st

st.set_page_config(
    page_title="RAG Ingestion Pipeline",
    layout="centered",
)

BACKEND_URL = os.environ.get("BACKEND_URL", "http://backend:8000")

st.title("RAG Ingestion Pipeline")
st.write("A document ingestion pipeline for RAG workflows.")

# Pipeline Stage Selection
st.header("1. Select Task")
task_options = [
    "Parsing",
    "Chunking (not yet implemented)",
    "Embedding (not yet implemented)",
    "Vector Storage (not yet implemented)",
]
selected_task = st.selectbox("Pipeline Task", options=task_options)

if selected_task != "Parsing":
    st.info(
        f"The '{selected_task.split(' ')[0]}' stage is not yet implemented. Please check back later."
    )
    st.stop()

# Parsing Configuration
st.header("2. Configure Parsing")

col1, col2 = st.columns(2)

with col1:
    input_format_options = [
        "PDF",
        "DOCX (not yet implemented)",
        "PPTX (not yet implemented)",
        "XLSX (not yet implemented)",
        "HTML (not yet implemented)",
        "Image (not yet implemented)",
        "AsciiDoc (not yet implemented)",
        "Markdown (not yet implemented)",
    ]
    selected_input = st.selectbox("Input Format", options=input_format_options)

    if selected_input != "PDF":
        st.warning(
            f"Input format '{selected_input.split(' ')[0]}' is currently disabled. Please select PDF."
        )
        st.stop()

with col2:
    output_format = st.radio(
        "Output Format", options=["Markdown", "JSON"], horizontal=True
    )

# File Upload
st.header("3. Upload Document")
uploaded_file = st.file_uploader("Choose a PDF file", type=["pdf"])

if uploaded_file is not None:
    if st.button("Parse Document", type="primary"):
        # Clear previous result on new parse
        st.session_state.pop("task_result", None)

        # Map frontend output format to backend enum string
        backend_output_format = output_format.lower()

        with st.status(
            "Submitting document to parsing pipeline...", expanded=True
        ) as status:
            try:
                # 1. Submit the task
                st.write("Uploading file to backend...")
                files = {
                    "data": (
                        uploaded_file.name,
                        uploaded_file.getvalue(),
                        uploaded_file.type,
                    )
                }

                # Send the selected output format as a query parameter
                response = requests.post(
                    f"{BACKEND_URL}/documents/parse",
                    files=files,
                    params={"output_format": backend_output_format},
                )

                if not response.ok:
                    status.update(
                        label=f"Failed to submit task: {response.status_code}",
                        state="error",
                    )
                    st.error(response.text)
                    st.stop()

                task_data = response.json()
                task_id = task_data.get("task_id")

                st.write(f"Task submitted successfully! (Task ID: {task_id})")
                st.write(
                    "Processing document. This may take a while depending on the file size and content..."
                )

                # 2. Poll for results
                polling_interval = 2  # seconds
                max_retries = 300  # max 10 minutes (300 * 2 seconds)
                retries = 0

                task_result = None

                while retries < max_retries:
                    status_response = requests.get(
                        f"{BACKEND_URL}/documents/tasks/{task_id}"
                    )

                    if not status_response.ok:
                        status.update(
                            label="Error communicating with backend while polling.",
                            state="error",
                        )
                        st.error(status_response.text)
                        st.stop()

                    task_result = status_response.json()
                    task_status = task_result.get("status")

                    if task_status == "completed":
                        status.update(
                            label="Parsing completed successfully!", state="complete"
                        )
                        break
                    elif task_status == "failed":
                        error_msg = task_result.get("error", "Unknown error")
                        status.update(label="Parsing failed.", state="error")
                        st.error(f"Task failed: {error_msg}")
                        st.stop()

                    # Still processing
                    time.sleep(polling_interval)
                    retries += 1

                if retries >= max_retries:
                    status.update(label="Parsing timed out.", state="error")
                    st.error(
                        "The task took too long to complete. Please try again with a smaller file."
                    )
                    st.stop()

                # Store result in session_state to survive reruns (like clicking download)
                if task_result:
                    st.session_state["task_result"] = task_result
                    st.session_state["task_output_format"] = output_format

            except requests.exceptions.ConnectionError:
                status.update(label="Connection Error", state="error")
                st.error(
                    f"Failed to connect to the backend API at {BACKEND_URL}. Ensure the backend is running."
                )
                st.stop()
            except Exception as e:
                status.update(label="Unexpected Error", state="error")
                st.error(f"An unexpected error occurred: {e}")
                st.stop()

# --- OUTSIDE the Parse Document button block ---
# 3. Display Results
if "task_result" in st.session_state and st.session_state["task_result"].get("content"):
    task_result = st.session_state["task_result"]
    content = task_result["content"]
    task_format = st.session_state.get("task_output_format", "Markdown")

    header_col1, header_col2 = st.columns([0.7, 0.3])
    with header_col1:
        st.header("Parsing Result")
    with header_col2:
        # Add an empty line to align the button vertically with the header
        st.write("")

        ext = "json" if task_format == "JSON" else "md"
        mime_type = "application/json" if task_format == "JSON" else "text/markdown"

        # If the file hasn't been re-uploaded, use the original name, otherwise a generic one
        file_base = (
            uploaded_file.name.rsplit(".", 1)[0] if uploaded_file else "document"
        )

        st.download_button(
            label=f"Download {task_format}",
            data=content,
            file_name=f"{file_base}.{ext}",
            mime=mime_type,
            use_container_width=True,
        )

    res_col1, res_col2 = st.columns(2)

    with res_col1:
        with st.expander("Raw Output", expanded=False):
            if task_format == "JSON":
                st.code(content, language="json")
            else:
                st.code(content, language="markdown")

    with res_col2:
        with st.expander("Rendered Preview", expanded=False):
            if task_format == "Markdown":
                st.markdown(content)
            elif task_format == "JSON":
                import json

                try:
                    st.json(json.loads(content))
                except json.JSONDecodeError:
                    st.error("Failed to parse JSON for preview.")
