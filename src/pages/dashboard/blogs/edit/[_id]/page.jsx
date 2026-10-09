import { Link, useNavigate, useParams } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { ImagePlus, Eye, Loader2, Plus, X } from "lucide-react";


import API from "@/api";
import { detectPlatform, getSocialIcon } from "@/lib/socialMedia";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "./rich-text-editor";
import { BlogPreviewModal } from "./preview-modal";
import { toast } from "sonner";
const EditBlogPost = () => {
  const navigate = useNavigate();
  const params = useParams();
  const _id = params._id;
  const [imagePreview, setImagePreview] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialEditorContent, setInitialEditorContent] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    url: "",
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    short_description: "",
    main_content: "",
    social_links: [],
    image_file: null,
  });
  const [postData, setPostData] = useState({});

  const getPostDetails = async () => {
    try {
      const response = await API.blog.getBlogDetails({ _id });

      if (response) {
        setPostData(response);
        setFormData({
          title: response.title || "",
          author: response.author || "",
          url: response.url || "",
          meta_title: response.meta_title || "",
          meta_description: response.meta_description || "",
          meta_keywords: response.meta_keywords || "",
          short_description: response.short_description || "",
          main_content: response.main_content || "",
          social_links: Array.isArray(response.social_links)
            ? response.social_links
                .map((s) => (typeof s === "string" ? s : s?.url || ""))
                .filter(Boolean)
            : [],
          image_file: null,
        });
        // Set ONCE — never updated again, so it doesn't re-seed on every keystroke
        setInitialEditorContent(response.main_content || "");

        // Set existing image preview if available
        if (response.image) {
          setImagePreview(response.image);
        }
      }
    } catch (error) {
      console.error("Error fetching blog details:", error);
      toast.error("Failed to load blog details");
    }
  };

  useEffect(() => {
    getPostDetails();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: name === "url" ? value.toLowerCase().replace(/\s+/g, "-").replace(/^\/+/, "") : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File size must be under 2 MB");
        e.target.value = "";
        return;
      }

      // Validate file type
      if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
        toast.error("Please select a JPEG or PNG image");
        e.target.value = "";
        return;
      }

      setFormData((prevState) => ({
        ...prevState,
        image_file: file,
      }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      author: "",
      url: "",
      meta_title: "",
      meta_description: "",
      meta_keywords: "",
      short_description: "",
      main_content: "",
      social_links: [],
      image_file: null,
    });
    setImagePreview(null);
  };

  const addSocialLink = () => {
    setFormData((prev) => ({
      ...prev,
      social_links: [...prev.social_links, ""],
    }));
  };

  const removeSocialLink = (index) => {
    setFormData((prev) => ({
      ...prev,
      social_links: prev.social_links.filter((_, i) => i !== index),
    }));
  };

  const handleSocialLinkChange = (index, value) => {
    setFormData((prev) => {
      const next = [...prev.social_links];
      next[index] = value;
      return { ...prev, social_links: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (
      !formData.title ||
      !formData.author ||
      !formData.url ||
      !formData.meta_title ||
      !formData.meta_description ||
      !formData.meta_keywords ||
      !formData.main_content
    ) {
      toast.error("All fields are required.");
      return;
    }

    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      if (key === "image_file") {
        // Only append the file when one was actually selected
        if (formData[key]) data.append("image_file", formData[key]);
      } else if (key === "social_links") {
        // Serialize social links as JSON with the platform auto-detected from each URL
        const cleaned = formData.social_links
          .map((u) => (u || "").trim())
          .filter(Boolean)
          .map((u) => ({ platform: detectPlatform(u), url: u }));
        data.append("social_links", JSON.stringify(cleaned));
      } else {
        data.append(key, formData[key]);
      }
    });

    setIsSubmitting(true);
    try {
      const response = await API.blog.updateBlog(data, _id);
      // Check if response exists and is successful
      if (response) {
        // Check for different possible success indicators
        if (
          response.success === true ||
          response.message?.toLowerCase().includes("success") ||
          response.status === "success" ||
          response.message?.toLowerCase().includes("updated") ||
          response.message?.toLowerCase().includes("modified") ||
          response.message?.toLowerCase().includes("blog") ||
          response._id || // If response has _id, it's likely successful
          response.title || // If response has title, it's likely successful
          (typeof response === "object" &&
            Object.keys(response).length > 0 &&
            !response.error)
        ) {
          toast.success("Blog updated successfully!");
          resetForm();
          navigate("/dashboard/blogs/all-blogs");
        } else {
          // Check if it's actually an error response
          const errorMessage =
            response?.message ||
            response?.error ||
            "Failed to update the blog. Please try again.";
          toast.error(errorMessage);
          console.error("API Error:", response);
        }
      } else {
        // If response is null/undefined, it might be an error
        toast.error("Failed to update the blog. Please try again.");
        console.error("API Error: No response received");
      }
    } catch (error) {
      toast.error("Failed to update the blog. Please try again.");
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card className="w-full mx-auto shadow-none border bg-[#FBFBFB] h-[calc(100vh-100px)] flex flex-col p-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-3 flex-shrink-0">
          <CardTitle className=" text-[#18181B] text-base font-semibold flex items-center gap-2">
            <Link
              to={"/dashboard/blogs"}
              className="p-2 hover:bg-gray-50 rounded-md transition-colors duration-200 cursor-pointer"
            >
              <img
                src={"/assets/images/dashboard/leftArrow.svg"}
                alt="leftArrow"
                className="w-4 h-4 hover:scale-110 transition-transform duration-200"
              />
            </Link>
            <div className="w-[1.5px] h-[15px] bg-[#7F7F7F]"></div>
            Edit Blog Post
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewOpen(true)}
          >
            <Eye className="w-4 h-4" />
            Preview
          </Button>
        </CardHeader>
        <CardContent className="py-0 px-4 flex-1 overflow-y-auto custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="image_file">Featured Image*</Label>
              <div className="flex items-center gap-4">
                <div className="relative w-full h-40 border-2 border-dashed rounded-lg flex flex-col  gap-y-4 items-center justify-center overflow-hidden">
                  {imagePreview ? (
                    /* Use plain <img> — Next.js Image blocks Cloudinary URLs
                       that aren't in next.config domains, and blocks blob/data URIs */
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <ImagePlus className="w-10 h-10 text-muted-foreground" />
                      <div className="text-sm text-muted-foreground">
                        Drag and drop or click to upload
                        <br />
                        Image must be under 2 MB &amp; JPEG, PNG only.
                      </div>
                    </>
                  )}

                  <input
                    type="file"
                    id="image_file"
                    name="image_file"
                    accept="image/jpeg, image/png, image/jpg"
                    onChange={handleImageChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <Label htmlFor="title" className="text-[#4A4A4B]">
                Title*
              </Label>
              <Input
                id="title"
                name="title"
                placeholder="Enter blog post title"
                value={formData.title}
                className="h-11"
                onChange={handleInputChange}
              />
            </div>

            {/* Author */}
            <div className="space-y-1">
              <Label htmlFor="author" className="text-[#4A4A4B]">
                Author*
              </Label>
              <Input
                id="author"
                name="author"
                placeholder="Enter author name"
                className="h-11"
                value={formData.author}
                onChange={handleInputChange}
              />
            </div>
            {/* Url */}
            <div className="space-y-1">
              <Label htmlFor="author" className="text-[#4A4A4B]">
                Url*
              </Label>
              <Input
                id="url"
                name="url"
                placeholder="Enter your url"
                className="h-11"
                value={formData.url}
                onChange={handleInputChange}
              />
            </div>

            {/* Meta Title */}
            <div className="space-y-1">
              <Label htmlFor="meta_title" className="text-[#4A4A4B]">
                Meta Title*
              </Label>
              <Input
                id="meta_title"
                name="meta_title"
                placeholder="Enter SEO meta title"
                className="h-11"
                value={formData.meta_title}
                onChange={handleInputChange}
              />
            </div>

            {/* Meta Description */}
            <div className="space-y-1">
              <Label htmlFor="meta_description" className="text-[#4A4A4B]">
                Meta Description*
              </Label>
              <Textarea
                id="meta_description"
                name="meta_description"
                placeholder="Enter SEO meta description"
                className="h-11"
                value={formData.meta_description}
                onChange={handleInputChange}
              />
            </div>

            {/* Meta Keywords */}
            <div className="space-y-1">
              <Label htmlFor="meta_description" className="text-[#4A4A4B]">
                Meta Keywords*
              </Label>
              <Textarea
                id="meta_keywords"
                name="meta_keywords"
                placeholder="Enter SEO meta keywords"
                className="h-11"
                value={formData.meta_keywords}
                onChange={handleInputChange}
              />
            </div>

            {/* Short Description */}
            <div className="space-y-1">
              <Label htmlFor="short_description" className="text-[#4A4A4B]">
                Short Description*
              </Label>
              <Textarea
                id="short_description"
                name="short_description"
                placeholder="Enter a brief description of the blog post"
                className="h-11"
                value={formData.short_description}
                onChange={handleInputChange}
              />
            </div>

            {/* Social Media Links */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[#4A4A4B]">Social Media Links</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSocialLink}
                  className="flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>
              {formData.social_links.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No social media links added. Click &quot;Add&quot; to include
                  one — the icon is detected automatically from the link.
                </p>
              ) : (
                <div className="space-y-3">
                  {formData.social_links.map((link, index) => {
                    const Icon = getSocialIcon(link);
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border bg-gray-50 text-gray-600">
                          <Icon className="w-4 h-4" />
                        </span>
                        <Input
                          type="url"
                          value={link}
                          onChange={(e) =>
                            handleSocialLinkChange(index, e.target.value)
                          }
                          placeholder="https://facebook.com/your-page"
                          className="h-11 flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSocialLink(index)}
                          className="shrink-0 text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Main Content */}
            <div className="space-y-1">
              <Label htmlFor="main_content" className="text-[#4A4A4B]">
                Main Content*
              </Label>
              <RichTextEditor
                name="main_content"
                initialContent={initialEditorContent}
                onChange={(content) =>
                  setFormData((prevState) => ({
                    ...prevState,
                    main_content: content,
                  }))
                }
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#41A3FF] text-sm px-4 hover:bg-[#41A3FF]/90 flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Publishing...
                  </>
                ) : (
                  "Edit Blog Post"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <BlogPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={formData.title}
        author={formData.author}
        shortDescription={formData.short_description}
        content={formData.main_content}
        imageUrl={imagePreview}
        socialLinks={formData.social_links}
      />
    </>
  );
};

export default EditBlogPost;
