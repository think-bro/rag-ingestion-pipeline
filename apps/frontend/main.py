import streamlit as st
import requests
import os

st.set_page_config(
    page_title="RAG Ingestion Pipeline",
    page_icon="📄",
    layout="centered",
)

BACKEND_URL = os.environ.get("BACKEND_URL", "http://backend:8000")

st.title("RAG Ingestion Pipeline")
st.write("Upload a document to extract structured markdown.")

uploaded_file = st.file_uploader("Choose a file", type=["pdf", "docx", "txt", "md"])

if uploaded_file is not None:
    if st.button("Parse Document"):
        with st.spinner("Parsing document..."):
            try:
                files = {
                    "data": (
                        uploaded_file.name,
                        uploaded_file.getvalue(),
                        uploaded_file.type,
                    )
                }
                response = requests.post(f"{BACKEND_URL}/documents/parse", files=files)

                # Litestar returns 201 for POST by default, so we check response.ok
                if response.ok:
                    st.success("Document parsed successfully!")
                    result = response.json()
                    markdown_content = result.get("parsed_content", "")

                    st.markdown("### Parsed Markdown Result")
                    st.code(markdown_content, language="markdown")

                    st.download_button(
                        label="Download Markdown File",
                        data=markdown_content,
                        file_name=f"{uploaded_file.name.rsplit('.', 1)[0]}.md",
                        mime="text/markdown",
                    )
                else:
                    st.error(f"Error {response.status_code}: {response.text}")
            except Exception as e:
                st.error(f"Failed to connect to the backend API: {e}")
