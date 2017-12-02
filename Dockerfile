# Use an official Node runtime as a parent image
FROM node

# Set the working directory to /app
WORKDIR /usr/local/src/mvg-engine

# Copy the current directory contents into the container at /mvg-engine
ADD . /usr/local/src/mvg-engine

# Install any needed packages specified in dependencies.txt
# RUN pip install --trusted-host pypi.python.org -r dependencies.txt
#copy app dependencies
COPY package.json .
#install app dependencies
RUN npm install --only=production

# Make port 9999 available to the world outside this container
EXPOSE 9999

# Define environment variable
# ENV NODE_MODULES 

# Run app.py when the container launches
CMD ["node", "mvg_app.js"]