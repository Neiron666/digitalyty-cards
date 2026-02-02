import mongoose from "mongoose";

import Organization from "../models/Organization.model.js";
import OrganizationMember from "../models/OrganizationMember.model.js";
import { HttpError } from "./httpError.js";

function notFound() {
    throw new HttpError(404, "Not found", "NOT_FOUND");
}

export function isValidObjectId(value) {
    return mongoose.Types.ObjectId.isValid(String(value || ""));
}

export async function assertActiveOrgAndMembershipOrNotFound({
    orgId,
    userId,
}) {
    if (!isValidObjectId(orgId) || !isValidObjectId(userId)) notFound();

    const org = await Organization.findOne({ _id: orgId, isActive: true })
        .select("_id")
        .lean();
    if (!org?._id) notFound();

    const member = await OrganizationMember.findOne({
        orgId: org._id,
        userId,
        status: "active",
    })
        .select("_id role status")
        .lean();

    if (!member?._id) notFound();

    return { org, member };
}
