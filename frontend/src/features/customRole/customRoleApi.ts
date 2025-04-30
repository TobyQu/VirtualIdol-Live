import { getRequest, postRequest } from "../httpclient/httpclient";

export const custoRoleFormData = {
    id: 0,
    role_name: "",
    persona: "",
    personality: "",
    scenario: "",
    examples_of_dialogue: "",
    custom_role_template_type: "",
    role_package_id: -1
}

export type CustomRoleFormData = typeof custoRoleFormData;

export const vrmModelData = {
    name: ""
}
export type VrmModel = typeof vrmModelData;
export type CustomRoleResult = typeof custoRoleFormData & {
    id: number;
};

export const backgroundImageData = {
    id: -1,
    original_name: "",
    image: ""
}
export type BackgroundImage = typeof backgroundImageData;


export async function customroleCreate(custoRoleFormData: CustomRoleFormData) {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };
    const chatRes = await postRequest("/api/v1/chatbot/customrole/create", headers, custoRoleFormData);
    if (chatRes.code !== 200) {
        throw new Error(chatRes.message || "Failed to create custom role");
    }

    return chatRes.response;
}

export async function customrolEdit(id: Number, custoRoleFormData: CustomRoleFormData) {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };
    const chatRes = await postRequest(`/api/v1/chatbot/customrole/edit/${id}`, headers, custoRoleFormData);
    if (chatRes.code !== 200) {
        throw new Error(chatRes.message || "Failed to edit custom role");
    }

    return chatRes.response;
}

export async function customroleList() {

    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };

    const chatRes = await getRequest("/api/v1/chatbot/customrole/list", headers);
    if (chatRes.code !== 200) {
        throw new Error(chatRes.message || "Failed to get custom role list");
    }

    return chatRes.response;
}

export async function customroleDetail(id: number) {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };

    const chatRes = await getRequest(`/api/v1/chatbot/customrole/detail/${id}`, headers);
    if (chatRes.code !== 200) {
        throw new Error(chatRes.message || "Failed to get custom role detail");
    }

    return chatRes.response;
}

export async function customroleDelete(id: number) {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };

    const chatRes = await postRequest(`/api/v1/chatbot/customrole/delete/${id}`, headers, {});
    if (chatRes.code !== 200) {
        throw new Error(chatRes.message || "Failed to delete custom role");
    }

    return chatRes.response;
}